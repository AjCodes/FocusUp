export type Habit = {
  id: string;
  user_id: string;
  title: string;
  cue: string | null;
  focus_attribute: 'CO' | 'PH' | 'EM' | 'SO';
  created_at: string;
};


