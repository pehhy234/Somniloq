-- Create models table
create table if not exists public.models (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  provider text not null, -- e.g. google, openai, openrouter
  model_id text not null, -- e.g. gemini-1.5-flash
  icon_url text,
  category text default 'All', -- e.g. Free, DeepSeek, Gemini, Gpt
  tags text[] default '{}',
  cost_per_msg numeric default 0,
  speed_rating int check (speed_rating >= 1 and speed_rating <= 5),
  intelligence_rating int check (intelligence_rating >= 1 and intelligence_rating <= 5),
  limit_rating int check (limit_rating >= 1 and intelligence_rating <= 5),
  is_active boolean default true,
  api_key_name text, -- e.g. OPENAI_API_KEY
  base_url text, -- optional override
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.models enable row level security;

-- Policies
create policy "Allow public read-only access to active models"
  on public.models for select
  using (is_active = true);

create policy "Allow admins full access to models"
  on public.models for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Function to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger on_models_updated
  before update on public.models
  for each row execute procedure public.handle_updated_at();

-- Insert some default models
insert into public.models (name, description, provider, model_id, category, tags, cost_per_msg, speed_rating, intelligence_rating, limit_rating)
values 
  ('Gemini 2.0 Flash', '速度極快，適合多數日常聊天', 'google', 'gemini-2.0-flash', 'Gemini', '{Free}', 0, 5, 3, 4),
  ('Gemini 2.0 Pro', '高複雜度推理，語境理解更強', 'google', 'gemini-2.0-pro-exp-02-05', 'Gemini', '{Pro}', 0, 4, 5, 3),
  ('Claude 3.5 Sonnet', '行文流暢，情緒理解細膩', 'openrouter', 'anthropic/claude-3.5-sonnet', 'Anthropic', '{}', 0, 4, 4, 3),
  ('DeepSeek-V3', '最強開源模型，邏輯能力出眾', 'openrouter', 'deepseek/deepseek-chat', 'DeepSeek', '{Free}', 0, 4, 5, 4),
  ('GPT-4o', '全能均衡，極致強大', 'openrouter', 'openai/gpt-4o', 'Gpt', '{}', 0, 4, 5, 3);
