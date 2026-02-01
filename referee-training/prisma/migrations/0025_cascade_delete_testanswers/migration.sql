-- AlterTable: Add CASCADE delete to TestAnswer -> Question relationship
ALTER TABLE "TestAnswer" DROP CONSTRAINT IF EXISTS "TestAnswer_questionId_fkey";
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_questionId_fkey" 
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
