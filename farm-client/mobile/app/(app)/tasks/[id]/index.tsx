import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { tasksAPI } from '@/modules/worker';
import { Button, Card, colors } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  commentRow: {
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentMeta: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  commentBody: { fontSize: 14, color: colors.text },
  deleteLink: { fontSize: 12, color: '#DC2626', marginTop: 6, fontWeight: '600' },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  attachName: { fontSize: 14, color: colors.text, flexShrink: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  emptyNote: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
});

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#9CA3AF',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  URGENT: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};

function unwrapOne<T>(payload: any): T | null {
  if (payload?.id) return payload as T;
  if (payload?.data?.id) return payload.data as T;
  return null;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

interface TaskComment {
  id: string;
  authorId?: string | null;
  authorName?: string | null;
  body: string;
  createdAt: string;
}

interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedByName?: string | null;
  createdAt: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  nextDueAt?: string | null;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const { hasPermission, hasAnyPermission } = usePermission();

  // Mirrors the API: create/edit are hr.write, delete is hr.delete, comments
  // and attachments accept hr.write / worker.write.
  const canManage = hasPermission('hr.write');
  const canRemove = hasPermission('hr.delete');
  const canComment = hasAnyPermission('hr.write', 'worker.write');

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [addingAttachment, setAddingAttachment] = useState(false);

  const loadTask = useCallback(async () => {
    if (!id) {
      setLoadError('Missing task id.');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const res = await tasksAPI.get(id);
      const record = unwrapOne<TaskDetail>(res.data);
      if (!record) {
        setLoadError('Task not found.');
        return;
      }
      setTask(record);
    } catch (err: any) {
      setLoadError(describeApiError(err, "Couldn't load this task"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const handleStatusUpdate = async (status: string) => {
    if (!task) return;
    const apply = async () => {
      try {
        // Workers update their own task through the self-scoped PUT /:id;
        // hr.write holders may use the same endpoint (service allows both).
        await tasksAPI.update(task.id, { status });
        success('Status updated');
        await loadTask();
      } catch (err: any) {
        showError(describeApiError(err, 'Failed to update the status.'));
      }
    };
    if (status === 'CANCELLED') {
      Alert.alert('Cancel Task', `Mark "${task.title}" as cancelled?`, [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel Task', style: 'destructive', onPress: apply },
      ]);
    } else {
      await apply();
    }
  };

  const handleDelete = () => {
    if (!task) return;
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksAPI.delete(task.id);
            success('Task deleted');
            router.back();
          } catch (err: any) {
            showError(describeApiError(err, 'Failed to delete the task.'));
          }
        },
      },
    ]);
  };

  const handleAddComment = async () => {
    if (!task || !commentBody.trim()) return;
    setPostingComment(true);
    try {
      await tasksAPI.addComment(task.id, commentBody.trim());
      setCommentBody('');
      await loadTask();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to post the comment.'));
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksAPI.deleteComment(commentId);
            await loadTask();
          } catch (err: any) {
            showError(describeApiError(err, 'Failed to delete the comment.'));
          }
        },
      },
    ]);
  };

  const handleAddAttachment = async () => {
    if (!task || !attachmentName.trim() || !attachmentUrl.trim()) return;
    setAddingAttachment(true);
    try {
      await tasksAPI.addAttachment(task.id, {
        fileName: attachmentName.trim(),
        fileUrl: attachmentUrl.trim(),
      });
      setAttachmentName('');
      setAttachmentUrl('');
      success('Attachment added');
      await loadTask();
    } catch (err: any) {
      showError(describeApiError(err, 'Failed to add the attachment.'));
    } finally {
      setAddingAttachment(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    Alert.alert('Remove Attachment', 'Remove this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksAPI.removeAttachment(attachmentId);
            await loadTask();
          } catch (err: any) {
            showError(describeApiError(err, 'Failed to remove the attachment.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading…" />
      </SafeAreaView>
    );
  }

  if (loadError || !task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load this task"
          message={loadError || 'Not found.'}
          onRetry={() => { setLoading(true); loadTask(); }}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const overdue =
    Boolean(task.dueDate) &&
    new Date(task.dueDate as string) < startOfToday &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED';

  const comments = task.comments || [];
  const attachments = task.attachments || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: PRIORITY_COLORS[task.priority] || '#9CA3AF' }]}>
              <Text style={styles.badgeText}>{task.priority}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[task.status] || '#9CA3AF' }]}>
              <Text style={styles.badgeText}>{String(task.status).replace('_', ' ')}</Text>
            </View>
            {overdue && (
              <View style={[styles.badge, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.badgeText}>OVERDUE</Text>
              </View>
            )}
            {task.isRecurring && (
              <View style={[styles.badge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.badgeText}>⟳ {task.recurrenceRule || 'RECURRING'}</Text>
              </View>
            )}
          </View>

          <Card>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned To</Text>
              <Text style={styles.detailValue}>{task.assignedToName || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={[styles.detailValue, overdue && { color: '#DC2626', fontWeight: '700' }]}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                {overdue ? ' · Overdue' : ''}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed</Text>
              <Text style={styles.detailValue}>{task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '—'}</Text>
            </View>
            {task.isRecurring && task.nextDueAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Next Occurrence</Text>
                <Text style={styles.detailValue}>{new Date(task.nextDueAt).toLocaleDateString()}</Text>
              </View>
            )}
          </Card>

          {task.description && (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.bodyText}>{task.description}</Text>
            </>
          )}

          {/* Quick status updates — managers flip anything, workers flip their own */}
          <View style={styles.actions}>
            {task.status !== 'PENDING' && task.status !== 'CANCELLED' && (
              <TouchableOpacity onPress={() => handleStatusUpdate('PENDING')} style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]} accessibilityLabel="Mark pending">
                <Text style={[styles.actionBtnText, { color: '#374151' }]}>Mark Pending</Text>
              </TouchableOpacity>
            )}
            {task.status !== 'IN_PROGRESS' && task.status !== 'CANCELLED' && (
              <TouchableOpacity onPress={() => handleStatusUpdate('IN_PROGRESS')} style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]} accessibilityLabel="Mark in progress">
                <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Mark In Progress</Text>
              </TouchableOpacity>
            )}
            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
              <TouchableOpacity onPress={() => handleStatusUpdate('COMPLETED')} style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} accessibilityLabel="Mark completed">
                <Text style={[styles.actionBtnText, { color: '#059669' }]}>Mark Completed</Text>
              </TouchableOpacity>
            )}
            {canManage && task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
              <TouchableOpacity onPress={() => handleStatusUpdate('CANCELLED')} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} accessibilityLabel="Cancel task">
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel Task</Text>
              </TouchableOpacity>
            )}
            {canManage && (
              <TouchableOpacity onPress={() => router.push(`/tasks/${task.id}/edit`)} style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} accessibilityLabel="Edit task">
                <Text style={[styles.actionBtnText, { color: '#059669' }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {canRemove && (
              <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} accessibilityLabel="Delete task">
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments */}
          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          {comments.length === 0 ? (
            <Text style={styles.emptyNote}>No comments yet.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Text style={styles.commentMeta}>
                  {c.authorName || 'Unknown'} · {formatDateTime(c.createdAt)}
                </Text>
                <Text style={styles.commentBody}>{c.body}</Text>
                {canComment && (
                  <TouchableOpacity onPress={() => handleDeleteComment(c.id)} accessibilityLabel="Delete comment">
                    <Text style={styles.deleteLink}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          {canComment && (
            <View>
              <TextInput
                value={commentBody}
                onChangeText={setCommentBody}
                placeholder="Write a comment…"
                style={[styles.input, { marginTop: 8 }]}
                multiline
                accessibilityLabel="Comment body"
              />
              <Button
                title={postingComment ? 'Posting…' : 'Post Comment'}
                onPress={handleAddComment}
                disabled={postingComment || !commentBody.trim()}
              />
            </View>
          )}

          {/* Attachments */}
          <Text style={styles.sectionTitle}>Attachments ({attachments.length})</Text>
          {attachments.length === 0 ? (
            <Text style={styles.emptyNote}>No attachments yet.</Text>
          ) : (
            attachments.map((a) => (
              <View key={a.id} style={styles.attachRow}>
                <Text style={styles.attachName}>📎 {a.fileName}</Text>
                {canComment && (
                  <TouchableOpacity onPress={() => handleRemoveAttachment(a.id)} accessibilityLabel={`Remove attachment ${a.fileName}`}>
                    <Text style={styles.deleteLink}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          {canComment && (
            <View style={{ marginTop: 8 }}>
              <TextInput
                value={attachmentName}
                onChangeText={setAttachmentName}
                placeholder="File name"
                style={styles.input}
                accessibilityLabel="Attachment file name"
              />
              <TextInput
                value={attachmentUrl}
                onChangeText={setAttachmentUrl}
                placeholder="File URL"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="url"
                accessibilityLabel="Attachment file URL"
              />
              <Button
                title={addingAttachment ? 'Adding…' : 'Add Attachment'}
                onPress={handleAddAttachment}
                disabled={addingAttachment || !attachmentName.trim() || !attachmentUrl.trim()}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
