-- AddForeignKey
ALTER TABLE "email_batches" ADD CONSTRAINT "email_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
