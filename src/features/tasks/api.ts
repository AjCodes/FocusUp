import { supabase } from '../../../lib/supabase';
import { Task } from './types';

export async function getTasks(userId: string): Promise<Task[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(userId: string, title: string, notes?: string): Promise<Task> {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: userId, title: title.trim(), notes: notes ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}


