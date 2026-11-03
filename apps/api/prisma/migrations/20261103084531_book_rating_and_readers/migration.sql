-- AlterTable
ALTER TABLE "books" ADD COLUMN     "rating" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "_BookReaders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BookReaders_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BookReaders_B_index" ON "_BookReaders"("B");

-- AddForeignKey
ALTER TABLE "_BookReaders" ADD CONSTRAINT "_BookReaders_A_fkey" FOREIGN KEY ("A") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookReaders" ADD CONSTRAINT "_BookReaders_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
