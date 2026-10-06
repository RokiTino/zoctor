create extension if not exists pg_cron;
select cron.schedule('care-appointment-reminders','*/5 * * * *','select care_private.queue_reminders()');
