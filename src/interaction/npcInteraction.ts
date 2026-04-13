import { isLlmRequestError, type LlmRequestError, type LlmClient } from '../llm/client';
import { applyKnowledgeTokenOutcome } from '../world/knowledgeState';
import type { ConversationMessage, Npc, Player, WorldState } from '../world/types';
import {
  createDefaultNpcFunctionRegistry,
  type NpcFunctionRegistry,
} from './npcActionFunctions';
import {
  createNpcActionExecutor,
  type NpcActionExecutionResult,
  type NpcActionExecutor,
} from './npcActionExecutor';
import {
  applyNpcDialogueConsequences,
  type NpcDialogueConsequenceTrace,
} from './npcDialogueConsequenceHook';
import { buildNpcPromptContext } from './npcPromptContext';

const applyTalkTrigger = (npc: Npc): Npc => {
  const talkTrigger = npc.triggers?.onTalk;
  if (!talkTrigger) {
    return npc;
  }

  return {
    ...npc,
    facts: {
      ...(npc.facts ?? {}),
      [talkTrigger.setFact]: talkTrigger.value,
    },
  };
};

const applyDeterministicNpcTalkState = (worldState: WorldState, npcId: string): WorldState => {
  const npc = worldState.npcs.find((candidate) => candidate.id === npcId);
  if (!npc) {
    return worldState;
  }

  const npcAfterTalkTrigger = applyTalkTrigger(npc);
  const hasNpcMutation = npcAfterTalkTrigger !== npc;

  const tokenGrantResolution = applyKnowledgeTokenOutcome(
    worldState.knowledgeState,
    {
      grantKnowledgeTokens: npc.knowledgeTokensGrantedOnTalk ?? [],
    },
    {
      tick: worldState.tick,
      grantedByActorId: npcId,
    },
  );

  const hasKnowledgeMutation = tokenGrantResolution.knowledgeState !== worldState.knowledgeState;
  if (!hasNpcMutation && !hasKnowledgeMutation) {
    return worldState;
  }

  return {
    ...worldState,
    knowledgeState: tokenGrantResolution.knowledgeState,
    npcs: worldState.npcs.map((candidate) =>
      candidate.id === npcId ? npcAfterTalkTrigger : candidate,
    ),
  };
};

export interface NpcInteractionRequest {
  npc: Npc;
  player: Player;
  worldState: WorldState;
  playerMessage: string;
}

export interface NpcInteractionResult {
  npcId: string;
  responseText: string;
  updatedWorldState: WorldState;
  llmError?: LlmRequestError;
  actionExecutionTrace?: NpcActionExecutionResult;
  consequenceTrace?: NpcDialogueConsequenceTrace;
}

export interface NpcInteractionService {
  handleNpcInteraction(request: NpcInteractionRequest): Promise<NpcInteractionResult>;
}

export interface NpcInteractionServiceOptions {
  actionExecutor?: NpcActionExecutor;
  functionRegistry?: NpcFunctionRegistry;
}

export const createNpcInteractionService = (
  llmClient: LlmClient,
  options: NpcInteractionServiceOptions = {},
): NpcInteractionService => {
  const actionExecutor = options.actionExecutor ?? createNpcActionExecutor();
  const functionRegistry = options.functionRegistry ?? createDefaultNpcFunctionRegistry();

  return {
  handleNpcInteraction: async (request: NpcInteractionRequest): Promise<NpcInteractionResult> => {
    const previousHistory =
      request.worldState.actorConversationHistoryByActorId[request.npc.id] ?? [];
    const playerMessageRecord: ConversationMessage = {
      role: 'player',
      text: request.playerMessage,
    };
    const historyWithPlayerMessage = [...previousHistory, playerMessageRecord];

    const llmResult = await llmClient
      .complete({
        actorId: request.npc.id,
        context: buildNpcPromptContext(request.npc, request.player, request.worldState),
        playerMessage: request.playerMessage,
        conversationHistory: historyWithPlayerMessage,
        availableFunctions: functionRegistry.resolveFunctions(request.npc),
      })
      .catch((err: unknown): LlmRequestError => ({
        kind: 'llm_request_error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }));

    if (isLlmRequestError(llmResult)) {
      const updatedHistoryByActorId = {
        ...request.worldState.actorConversationHistoryByActorId,
        [request.npc.id]: historyWithPlayerMessage,
      };
      const updatedWorldState: WorldState = {
        ...request.worldState,
        actorConversationHistoryByActorId: updatedHistoryByActorId,
      };

      return {
        npcId: request.npc.id,
        responseText: '',
        llmError: llmResult,
        updatedWorldState,
      };
    }

    const assistantText = llmResult.text ?? '';
    const assistantMessageRecord: ConversationMessage = {
      role: 'assistant',
      text: assistantText,
    };
    const nextHistoryForNpc: ConversationMessage[] = assistantText
      ? [...historyWithPlayerMessage, assistantMessageRecord]
      : historyWithPlayerMessage;

    const updatedHistoryByActorId: WorldState['actorConversationHistoryByActorId'] = {
      ...request.worldState.actorConversationHistoryByActorId,
      [request.npc.id]: nextHistoryForNpc,
    };

    const stateWithUpdatedHistory: WorldState = {
      ...request.worldState,
      actorConversationHistoryByActorId: updatedHistoryByActorId,
    };

    const worldStateWithTalkState = applyDeterministicNpcTalkState(
      stateWithUpdatedHistory,
      request.npc.id,
    );

    const consequenceResult = applyNpcDialogueConsequences({
      npcId: request.npc.id,
      worldState: worldStateWithTalkState,
      outcome: llmResult.outcome,
    });

    const updatedWorldState = consequenceResult.updatedWorldState;

    const actionExecutionTrace = llmResult.actions?.length
      ? actionExecutor.execute({
          npcId: request.npc.id,
          worldState: updatedWorldState,
          actions: llmResult.actions,
        })
      : undefined;

    return {
      npcId: request.npc.id,
      responseText: assistantText ? `${request.npc.displayName}: ${assistantText}` : '',
      updatedWorldState: actionExecutionTrace?.updatedWorldState ?? updatedWorldState,
      actionExecutionTrace,
      consequenceTrace: consequenceResult.trace,
    };
  },
  };
};

export const handleNpcInteraction = async (
  request: NpcInteractionRequest,
): Promise<NpcInteractionResult> => {
  const fallbackText = `${request.npc.displayName} has nothing to say yet.`;
  const playerMessageRecord: ConversationMessage = {
    role: 'player',
    text: request.playerMessage,
  };
  const assistantMessageRecord: ConversationMessage = {
    role: 'assistant',
    text: fallbackText,
  };
  const previousHistory = request.worldState.actorConversationHistoryByActorId[request.npc.id] ?? [];

  return {
    npcId: request.npc.id,
    responseText: `${request.npc.displayName}: ${fallbackText}`,
    updatedWorldState: {
      ...request.worldState,
      actorConversationHistoryByActorId: {
        ...request.worldState.actorConversationHistoryByActorId,
        [request.npc.id]: [
          ...previousHistory,
          playerMessageRecord,
          assistantMessageRecord,
        ],
      },
    },
  };
};
