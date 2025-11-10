-- Atomic increment function that fails if profile row does not exist.
-- This version intentionally throws an error when there's no matching profile
-- because missing profiles indicate a logical problem (should not happen).

create or replace function public.increment_total_points(p_user_id uuid, p_delta int)
returns int as $$
begin
  -- Try to update existing profile
  -- Note: the profiles table in this project uses `user_id` as the PK column.
  update public.profiles
  set total_points = coalesce(total_points, 0) + p_delta
  where user_id = p_user_id;

  -- If no row was updated, throw an error instead of inserting
  if not found then
    raise exception 'profile not found for user_id=%', p_user_id;
  end if;

  -- Return the new total_points value
  return (select total_points from public.profiles where user_id = p_user_id);
end;
$$ language plpgsql security definer;