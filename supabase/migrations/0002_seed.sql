-- =============================================================
-- IrisLabs CRM — Demo seed data
-- Run AFTER 0001_schema.sql, once you have a Supabase project.
--
-- This creates a demo user (mario@irislabs.com / Mario123!)
-- and ~20 leads + calls, follow-ups, tasks and activities.
-- Everything is scoped to the demo user, so RLS stays intact.
-- Delete this file later if you want a clean start.
-- =============================================================

-- 1. Demo auth user (SQL editor runs as superuser, so this is allowed)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, invited_at, confirmation_token, recovery_token,
  email_change_token_new, email_change, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'mario@irislabs.com', crypt('Mario123!', gen_salt('bf')),
  now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}',
  '{"full_name":"Mario Delgado"}', now(), now()
on conflict (id) do nothing;

-- 2. Profile row
insert into public.profiles (id, full_name, role)
values ('00000000-0000-0000-0000-000000000001', 'Mario Delgado', 'owner')
on conflict (id) do nothing;

-- 3. Demo leads
with demo as (select id as uid from auth.users where email = 'mario@irislabs.com')
insert into public.leads (
  id, user_id, full_name, company, job_title, phone, whatsapp, email,
  website, country, city, industry, source, status, priority, assigned_to,
  notes, last_contacted_at, next_follow_up_at, created_at, updated_at
)
select
  l.id::uuid, d.uid, l.full_name, l.company, l.job_title, l.phone, l.whatsapp, l.email,
  l.website, l.country, l.city, l.industry, l.source, l.status, l.priority, d.uid,
  l.notes, l.last_contacted_at, l.next_follow_up_at, l.created_at, l.updated_at
from demo d, (values
  ('10000000-0000-0000-0000-000000000001', 'Sarah Mitchell', 'BrightPath Logistics', 'Operations Director', '+1 (202) 555-0134', '+12025550134', 'sarah.mitchell@brightpath.com', 'https://brightpath.com', 'United States', 'Chicago', 'Logistics', 'Cold List', 'Meeting Booked', 'High', 'Very interested in our tracking module. Wants a demo this week.', now() - interval '1 day', now() + interval '2 days', now() - interval '9 days', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000002', 'James Osei', 'KROIM', 'Founder', '+233 24 555 0198', '233245550198', 'j.osei@kroim.io', 'https://kroim.io', 'Ghana', 'Accra', 'Software', 'LinkedIn', 'Interested', 'High', 'Building a fintech product. Pricing discussion scheduled.', now() - interval '1 day', now() + interval '5 days', now() - interval '14 days', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000003', 'Laura Bennett', 'Nova Health Clinic', 'Practice Manager', '+44 20 7946 0958', '442079460958', 'laura.b@novahealth.co.uk', 'https://novahealth.co.uk', 'United Kingdom', 'London', 'Healthcare', 'Referral', 'Follow-up', 'Medium', 'Wants to compare us with their current provider before deciding.', now() - interval '2 days', now() + interval '1 day', now() - interval '20 days', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000004', 'Miguel Herrera', 'Grupo Herrera', 'Procurement Lead', '+52 55 1234 5678', '525512345678', 'mherrera@gherrera.mx', 'https://grupoherrera.mx', 'Mexico', 'Mexico City', 'Manufacturing', 'Event', 'Negotiation', 'High', 'Negotiating annual contract. Focus on volume discount.', now() - interval '3 hours', now() + interval '3 days', now() - interval '34 days', now() - interval '3 hours'),
  ('10000000-0000-0000-0000-000000000005', 'Emily Carter', 'Bluebird Realty', 'Principal Broker', '+1 (305) 555-0177', '+13055550177', 'emily@bluebirdrealty.com', 'https://bluebirdrealty.com', 'United States', 'Miami', 'Real Estate', 'Website', 'Proposal Sent', 'Medium', 'Sent proposal Monday. Waiting on legal review.', now() - interval '5 days', now() + interval '4 days', now() - interval '40 days', now() - interval '5 days'),
  ('10000000-0000-0000-0000-000000000006', 'Daniel Kim', 'FinEdge Capital', 'CFO', '+1 (646) 555-0143', '+16465550143', 'dkim@finedge.cap', 'https://finedge.cap', 'United States', 'New York', 'Finance', 'Cold List', 'Called', 'Medium', 'Introduced myself, they asked to call back next month.', now() - interval '11 days', now() + interval '12 days', now() - interval '30 days', now() - interval '11 days'),
  ('10000000-0000-0000-0000-000000000007', 'Ana Souza', 'TechFlow Software', 'CEO', '+55 11 99999 1234', '5511999991234', 'ana@techflow.com.br', 'https://techflow.com.br', 'Brazil', 'São Paulo', 'Software', 'Referral', 'Won', 'High', 'Signed the annual plan. Onboarding scheduled.', now() - interval '7 days', null, now() - interval '60 days', now() - interval '7 days'),
  ('10000000-0000-0000-0000-000000000008', 'Thomas Weber', 'Weber Bau GmbH', 'Managing Director', '+49 30 901820 44', '493090182044', 't.weber@weberbau.de', 'https://weberbau.de', 'Germany', 'Berlin', 'Construction', 'Google', 'No Answer', 'Low', '', now() - interval '6 days', null, now() - interval '25 days', now() - interval '6 days'),
  ('10000000-0000-0000-0000-000000000009', 'Chloe Dubois', 'Maison Dubois', 'Owner', '+33 1 42 68 53 00', '33142685300', 'chloe@maisondubois.fr', 'https://maisondubois.fr', 'France', 'Paris', 'Hospitality', 'Cold List', 'Not Interested', 'Low', 'Not a fit this quarter — may revisit later in the year.', now() - interval '15 days', null, now() - interval '45 days', now() - interval '15 days'),
  ('10000000-0000-0000-0000-000000000010', 'Priya Sharma', 'Innova Retail', 'Category Head', '+91 98100 12345', '919810012345', 'priya.sharma@innovaretail.in', 'https://innovaretail.in', 'India', 'Mumbai', 'Retail', 'LinkedIn', 'Interested', 'High', 'Very responsive. Demo with the team next week.', now() - interval '1 day', now() + interval '7 days', now() - interval '12 days', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000011', 'Omar Al-Farsi', 'Gulf Freight Co', 'Operations Manager', '+971 50 555 0172', '971505550172', 'omar@gulffreight.ae', 'https://gulffreight.ae', 'United Arab Emirates', 'Dubai', 'Logistics', 'Event', 'New', 'High', 'Met at Logistics Expo. Follow up promptly.', null, now() + interval '1 day', now() - interval '2 days', now()),
  ('10000000-0000-0000-0000-000000000012', 'Grace Lin', 'Luminary Education', 'Academic Director', '+65 6123 4567', '6561234567', 'grace@luminary.edu.sg', 'https://luminary.edu.sg', 'Singapore', 'Singapore', 'Education', 'Website', 'Follow-up', 'Medium', '', now() - interval '3 days', null, now() - interval '18 days', now() - interval '3 days'),
  ('10000000-0000-0000-0000-000000000013', 'Robert Walker', 'Apex Manufacturing', 'Plant Manager', '+1 (214) 555-0169', '+12145550169', 'rwalker@apexmfg.com', 'https://apexmfg.com', 'United States', 'Dallas', 'Manufacturing', 'Purchased List', 'Proposal Sent', 'Medium', 'Quoted for 2 plants. Follow up after internal budget review.', now() - interval '8 days', now() + interval '9 days', now() - interval '50 days', now() - interval '8 days'),
  ('10000000-0000-0000-0000-000000000014', 'Sofia Rossi', 'Rosso Food Group', 'COO', '+39 06 1234 5678', '390612345678', 'sofia@rossofood.it', 'https://rossofood.it', 'Spain', 'Madrid', 'Food & Beverage', 'Cold List', 'Wrong Number', 'Low', 'Old number. Searching for the right contact.', now() - interval '22 days', null, now() - interval '38 days', now() - interval '22 days'),
  ('10000000-0000-0000-0000-000000000015', 'Henry Collins', 'Meridian Law LLP', 'Partner', '+1 (415) 555-0115', '+14155550115', 'hcollins@meridianlaw.com', 'https://meridianlaw.com', 'United States', 'San Francisco', 'Legal', 'Referral', 'Interested', 'High', 'Interested in case management workflows.', now() - interval '4 hours', now() + interval '2 days', now() - interval '16 days', now() - interval '4 hours'),
  ('10000000-0000-0000-0000-000000000016', 'Isabella Torres', 'SolarGrid Energy', 'Commissioning Engineer', '+61 2 5550 1234', '61255501234', 'i.torres@solargrid.com.au', 'https://solargrid.com.au', 'Australia', 'Sydney', 'Energy', 'Google', 'Follow-up', 'Medium', 'They want a comparison sheet and references.', now() - interval '2 days', now() + interval '3 days', now() - interval '28 days', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000017', 'Nathan Green', 'Greenfield Logistics', 'CTO', '+1 (404) 555-0128', '+14045550128', 'nathan@greenfieldlog.com', 'https://greenfieldlog.com', 'United States', 'Atlanta', 'Logistics', 'Cold List', 'Not Called', 'Medium', 'Fresh lead from the new list.', null, null, now() - interval '1 day', now()),
  ('10000000-0000-0000-0000-000000000018', 'Zoe Patterson', 'Patterson Advisors', 'Managing Partner', '+1 (212) 555-0182', '+12125550182', 'zoe@pattersonadv.com', 'https://pattersonadv.com', 'United States', 'New York', 'Consulting', 'Website', 'Meeting Booked', 'High', 'Demo on Thursday. Prepare pricing slide.', now() - interval '10 hours', now() + interval '8 hours', now() - interval '21 days', now() - interval '10 hours'),
  ('10000000-0000-0000-0000-000000000019', 'Yusuf Adeyemi', 'Vantage Telecoms', 'Chief Commercial Officer', '+234 803 555 0123', '2348035550123', 'yusuf@vantagetelecoms.ng', 'https://vantagetelecoms.ng', 'Nigeria', 'Lagos', 'Telecom', 'LinkedIn', 'Interested', 'High', 'Running a 2-week pilot starting Monday.', now() - interval '1 day', now() + interval '6 days', now() - interval '10 days', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000020', 'Martin Keller', 'Keller IT Solutions', 'CEO', '+1 (612) 555-0199', '+16125550199', 'mkeller@kellerit.com', 'https://kellerit.com', 'United States', 'Minneapolis', 'IT Services', 'Referral', 'Won', 'Medium', 'Contract signed for Q3 rollout.', now() - interval '20 days', null, now() - interval '75 days', now() - interval '20 days')
) as l(
  id, full_name, company, job_title, phone, whatsapp, email, website, country,
  city, industry, source, status, priority, notes, last_contacted_at,
  next_follow_up_at, created_at, updated_at
)
on conflict (id) do nothing;

-- 4. Demo calls (10)
with demo as (select id as uid from auth.users where email = 'mario@irislabs.com')
insert into public.calls (
  id, lead_id, user_id, called_at, duration_seconds, outcome, notes,
  follow_up_required, next_follow_up_at, created_at
)
select
  c.id::uuid, c.lead_id::uuid, d.uid, c.called_at, c.duration_seconds, c.outcome, c.notes,
  c.follow_up_required, c.next_follow_up_at, c.created_at
from demo d, (values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now() - interval '2 days', 900, 'Meeting Booked', 'Great call — she wants a full demo Friday.', true, now() + interval '2 days', now() - interval '2 days'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', now() - interval '3 days', 720, 'Interested', 'Asked for pricing. Very engaged.', true, now() + interval '5 days', now() - interval '3 days'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', now() - interval '6 hours', 1500, 'Other', 'Negotiating annual contract — volume discount requested.', true, now() + interval '3 days', now() - interval '6 hours'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', now() - interval '7 days', 1200, 'Meeting Booked', 'Closing call — aligned on terms.', false, null, now() - interval '7 days'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000010', now() - interval '1 day', 640, 'Interested', 'Demo with their team next week.', true, now() + interval '7 days', now() - interval '1 day'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000008', now() - interval '6 days', 300, 'No Answer', 'No answer — try again.', true, now() + interval '7 days', now() - interval '6 days'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000009', now() - interval '15 days', 480, 'Not Interested', 'Not a fit for them right now.', false, null, now() - interval '15 days'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000015', now() - interval '5 hours', 1100, 'Interested', 'Case management workflows — sending deck.', true, now() + interval '2 days', now() - interval '5 hours'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000018', now() - interval '10 hours', 800, 'Meeting Booked', 'Scheduled demo Thursday morning.', true, now() + interval '8 hours', now() - interval '10 hours'),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000019', now() - interval '1 day', 760, 'Interested', 'Kicked off 2-week pilot Monday.', true, now() + interval '6 days', now() - interval '1 day')
) as c(
  id, lead_id, called_at, duration_seconds, outcome, notes,
  follow_up_required, next_follow_up_at, created_at
)
on conflict (id) do nothing;

-- 5. Demo follow-ups (12 — includes some overdue/due today/upcoming)
with demo as (select id as uid from auth.users where email = 'mario@irislabs.com')
insert into public.follow_ups (
  id, lead_id, user_id, title, due_at, status, notes, created_at, updated_at, completed_at
)
select
  f.id::uuid, f.lead_id::uuid, d.uid, f.title, f.due_at, f.status, f.notes, f.created_at, f.updated_at, f.completed_at
from demo d, (values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Follow up on demo invite', now() - interval '6 hours', 'Pending', 'Confirm time for Friday demo.', now() - interval '3 days', now() - interval '3 days', null),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Send comparison deck', now() + interval '1 day', 'Pending', 'Compare feature-by-feature with competitor.', now() - interval '2 days', now() - interval '2 days', null),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'Budget review call', now() + interval '3 days', 'Pending', 'Volume discount negotiation.', now() - interval '1 day', now() - interval '1 day', null),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'Follow up on proposal', now() + interval '4 days', 'Pending', 'Check on legal review.', now() - interval '5 days', now() - interval '5 days', null),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000010', 'Team demo', now() + interval '7 days', 'Pending', 'Run product demo for category team.', now() - interval '1 day', now() - interval '1 day', null),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000011', 'Intro call', now() + interval '1 day', 'Pending', 'Met at Logistics Expo — schedule intro.', now() - interval '2 days', now() - interval '2 days', null),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000013', 'Follow up proposal', now() + interval '9 days', 'Pending', 'Budget review — 2 plants.', now() - interval '8 days', now() - interval '8 days', null),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000016', 'Send references', now() + interval '3 days', 'Pending', 'Comparison sheet + references.', now() - interval '2 days', now() - interval '2 days', null),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000018', 'Demo this week', now() + interval '8 hours', 'Pending', 'Thursday 10am demo.', now() - interval '10 hours', now() - interval '10 hours', null),
  ('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000019', 'Pilot kickoff', now() + interval '6 days', 'Pending', 'Monday pilot start.', now() - interval '1 day', now() - interval '1 day', null),
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'Close follow-up', now() - interval '9 days', 'Completed', 'Handled pricing.', now() - interval '12 days', now() - interval '9 days', now() - interval '9 days'),
  ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000016', 'Initial check-in', now() - interval '20 days', 'Completed', '', now() - interval '25 days', now() - interval '20 days', now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000004', 'Old follow-up (overdue)', now() - interval '4 days', 'Pending', 'Should have contacted — reschedule.', now() - interval '2 days', now() - interval '2 days', null)
) as f(
  id, lead_id, title, due_at, status, notes, created_at, updated_at, completed_at
)
on conflict (id) do nothing;

-- 6. Demo tasks
with demo as (select id as uid from auth.users where email = 'mario@irislabs.com')
insert into public.tasks (id, user_id, lead_id, title, description, due_at, priority, status, created_at, completed_at)
select
  t.id::uuid, d.uid, t.lead_id::uuid, t.title, t.description, t.due_at, t.priority, t.status, t.created_at, t.completed_at
from demo d, (values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Prepare Friday demo', 'Build the tracking module demo flow.', now() + interval '2 days', 'High', 'Pending', now() - interval '1 day', null),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Prepare pricing sheet', 'Draft the tiered pricing worksheet.', now() + interval '1 day', 'High', 'Pending', now() - interval '2 days', null),
  ('40000000-0000-0000-0000-000000000003', null, 'Call the 20 new lists', 'Work through the new cold list.', now() + interval '6 hours', 'Medium', 'Pending', now() - interval '1 day', null),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', 'Send onboarding docs', 'Send onboarding checklist to Ana.', now() - interval '3 days', 'Medium', 'Completed', now() - interval '10 days', now() - interval '3 days')
) as t(id, lead_id, title, description, due_at, priority, status, created_at, completed_at)
on conflict (id) do nothing;

-- 7. Demo activities
with demo as (select id as uid from auth.users where email = 'mario@irislabs.com')
insert into public.activities (id, lead_id, user_id, type, title, description, metadata, created_at)
select
  a.id::uuid, a.lead_id::uuid, d.uid, a.type, a.title, a.description, a.metadata, a.created_at
from demo d, (values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'call', 'Called Sarah Mitchell', 'Meeting booked on the first call.', '{"outcome":"Meeting Booked"}'::jsonb, now() - interval '2 days'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', 'status', 'Status changed to Won', 'Deal closed with annual plan.', '{"from":"Negotiation","to":"Won"}'::jsonb, now() - interval '7 days'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'status', 'Status changed to Negotiation', 'Volume discount discussion started.', '{"from":"Proposal Sent","to":"Negotiation"}'::jsonb, now() - interval '4 days'),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000011', 'lead_created', 'Lead created', 'Imported from Logistics Expo attendee list.', null, now() - interval '2 days')
) as a(id, lead_id, type, title, description, metadata, created_at)
on conflict (id) do nothing;

-- 8. Demo notifications
with demo as (select id as uid from auth.users where email = 'mario@irislabs.com')
insert into public.notifications (id, user_id, type, title, message, lead_id, read, created_at)
select
  n.id::uuid, d.uid, n.type, n.title, n.message, n.lead_id::uuid, n.read, n.created_at
from demo d, (values
  ('60000000-0000-0000-0000-000000000001', 'followup_due', 'Follow-up due today', 'Sarah Mitchell — demo invite confirmation.', '10000000-0000-0000-0000-000000000001', false, now() - interval '2 hours'),
  ('60000000-0000-0000-0000-000000000002', 'followup_overdue', 'Overdue follow-up', 'Miguel Herrera — budget review call was overdue.', '10000000-0000-0000-0000-000000000004', false, now() - interval '1 day'),
  ('60000000-0000-0000-0000-000000000003', 'meeting', 'Meeting coming up soon', 'Zoe Patterson — demo tomorrow 10am.', '10000000-0000-0000-0000-000000000018', false, now() - interval '3 hours')
) as n(id, type, title, message, lead_id, read, created_at)
on conflict (id) do nothing;