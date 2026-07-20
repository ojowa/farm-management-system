import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { Card, Button, colors } from '../../components/common/UIComponents';
import { rosterAPI, orgAdminAPI } from '../../services/api';
import { usePermission } from '../../hooks/usePermission';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
}

interface Assignment {
  id: string;
  shiftId: string;
  userId: string;
  date: string;
  notes?: string;
  shift: Shift;
}

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFT_COLORS: Record<string, string> = {
  '#3B82F6': '#3B82F6',
  '#10B981': '#10B981',
  '#F59E0B': '#F59E0B',
  '#EF4444': '#EF4444',
  '#8B5CF6': '#8B5CF6',
  '#EC4899': '#EC4899',
};

export default function RosterScreen() {
  const { canCreate } = usePermission();
  const canManage = canCreate('roster');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const loadData = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        rosterAPI.listShifts(),
        rosterAPI.listAssignments({
          startDate: weekDates[0].toISOString().split('T')[0],
          endDate: weekDates[6].toISOString().split('T')[0],
        }),
      ]);
      setShifts(sRes.data);
      setAssignments(aRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [weekDates[0]?.toISOString(), weekDates[6]?.toISOString()]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const getAssignmentsForDate = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    return assignments.filter((a) => a.date.split('T')[0] === key);
  };

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Duty Roster</Text>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={prevWeek} style={styles.navBtn}>
          <Text style={styles.navBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {formatDate(weekDates[0])} — {formatDate(weekDates[6])}
        </Text>
        <TouchableOpacity onPress={nextWeek} style={styles.navBtn}>
          <Text style={styles.navBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Shift Legend */}
      {shifts.length > 0 && (
        <View style={styles.legend}>
          {shifts.filter(s => s.isActive).map((shift) => (
            <View key={shift.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SHIFT_COLORS[shift.color] || '#9CA3AF' }]} />
              <Text style={styles.legendText}>{shift.name}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        weekDates.map((date, i) => {
          const dayAssignments = getAssignmentsForDate(date);
          const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
          return (
              <Card key={i} style={isToday ? { ...styles.dayCard, ...styles.todayCard } : styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, isToday && styles.todayText]}>
                  {DAY_NAMES[i]} {date.getDate()}
                </Text>
                {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>}
              </View>
              {dayAssignments.length === 0 ? (
                <Text style={styles.noAssign}>No assignments</Text>
              ) : (
                dayAssignments.map((a) => (
                  <View key={a.id} style={[styles.shiftTag, { backgroundColor: (SHIFT_COLORS[a.shift.color] || '#9CA3AF') + '20' }]}>
                    <View style={[styles.shiftDot, { backgroundColor: SHIFT_COLORS[a.shift.color] || '#9CA3AF' }]} />
                    <Text style={[styles.shiftName, { color: SHIFT_COLORS[a.shift.color] || '#9CA3AF' }]}>
                      {a.shift.name} ({a.shift.startTime}–{a.shift.endTime})
                    </Text>
                  </View>
                ))
              )}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  navBtnText: { fontSize: 16, color: '#374151' },
  weekLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6B7280' },
  loadingText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  dayCard: { marginBottom: 8 },
  todayCard: { borderColor: '#10B981', borderWidth: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  dayName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  todayText: { color: '#10B981' },
  todayBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  todayBadgeText: { fontSize: 10, color: '#065F46', fontWeight: '600' },
  noAssign: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  shiftTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginBottom: 4 },
  shiftDot: { width: 8, height: 8, borderRadius: 4 },
  shiftName: { fontSize: 12, fontWeight: '500' },
});
