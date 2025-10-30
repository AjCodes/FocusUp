import { supabase } from '../../../lib/supabase';
import { Habit } from './types';

export async function getHabits(userId: string): Promise<Habit[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Habit[];
}

export async function createHabit(userId: string, title: string, cue: string | null, focusAttribute: Habit['focus_attribute']): Promise<Habit> {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, title: title.trim(), cue, focus_attribute: focusAttribute })
    .select()
    .single();
  if (error) throw error;
  return data as Habit;
}


