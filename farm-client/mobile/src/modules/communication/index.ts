/**
 * Communication module — direct messages and formal correspondence.
 * Mirrors the admin portal's `communication` plan-module (Sidebar:
 * "Messages", "Correspondence").
 */
export { messagesAPI, correspondenceAPI } from '../../services/api';
export type { Message, Correspondence, CorrespondenceAttachment } from '../../services/types';
