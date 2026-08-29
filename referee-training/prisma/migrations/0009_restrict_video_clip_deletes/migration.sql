-- Prevent deleting video clips that are still used by practice questions.
ALTER TABLE "Question" DROP CONSTRAINT "Question_videoClipId_fkey";

ALTER TABLE "Question"
ADD CONSTRAINT "Question_videoClipId_fkey"
FOREIGN KEY ("videoClipId") REFERENCES "VideoClip"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
