-- Add CHECK constraint to ensure Activity has exactly one parent
ALTER TABLE "activities"
ADD CONSTRAINT "activity_must_have_one_parent" CHECK (
  (
    ("leadId" IS NOT NULL AND "contactId" IS NULL AND "dealId" IS NULL) OR
    ("leadId" IS NULL AND "contactId" IS NOT NULL AND "dealId" IS NULL) OR
    ("leadId" IS NULL AND "contactId" IS NULL AND "dealId" IS NOT NULL)
  )
);

-- Create index to improve query performance on polymorphic relationships
CREATE INDEX "idx_activity_parent" ON "activities"("leadId", "contactId", "dealId");
