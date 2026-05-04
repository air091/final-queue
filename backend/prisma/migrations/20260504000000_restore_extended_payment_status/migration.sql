ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'partial';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'waived';
