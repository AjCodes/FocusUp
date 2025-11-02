export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  created_at: string;
};


