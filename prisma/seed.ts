import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const cover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

type SeedBook = {
  title: string;
  isbn?: string;
  publisher?: string;
  year?: number;
  pages?: number;
  description: string;
  authors: string[];
  genres: string[];
  copies?: number;
  borrowFeeCents?: number;
  rentalFeeCents?: number | null;
};

const BOOKS: SeedBook[] = [
  {
    title: "The Great Gatsby",
    isbn: "9780743273565",
    publisher: "Scribner",
    year: 1925,
    pages: 180,
    description:
      "F. Scott Fitzgerald's portrait of the Jazz Age follows Nick Carraway as he is drawn into the orbit of the mysterious millionaire Jay Gatsby and his obsession with Daisy Buchanan.",
    authors: ["F. Scott Fitzgerald"],
    genres: ["Classics", "Literary Fiction"],
    copies: 4,
  },
  {
    title: "To Kill a Mockingbird",
    isbn: "9780061120084",
    publisher: "Harper Perennial",
    year: 1960,
    pages: 336,
    description:
      "Through the eyes of young Scout Finch, Harper Lee explores racial injustice in the American South as her father Atticus defends a black man falsely accused of a crime.",
    authors: ["Harper Lee"],
    genres: ["Classics", "Literary Fiction"],
    copies: 5,
  },
  {
    title: "1984",
    isbn: "9780451524935",
    publisher: "Signet Classic",
    year: 1949,
    pages: 328,
    description:
      "George Orwell's dystopian masterpiece imagines a totalitarian society ruled by Big Brother, where history is rewritten and independent thought is a crime.",
    authors: ["George Orwell"],
    genres: ["Classics", "Science Fiction", "Dystopian"],
    copies: 6,
  },
  {
    title: "Pride and Prejudice",
    isbn: "9780141439518",
    publisher: "Penguin Classics",
    year: 1813,
    pages: 432,
    description:
      "Jane Austen's sparkling comedy of manners follows Elizabeth Bennet as she spars with the proud Mr Darcy and slowly revises every judgement she has made.",
    authors: ["Jane Austen"],
    genres: ["Classics", "Romance"],
    copies: 4,
  },
  {
    title: "The Hobbit",
    isbn: "9780547928227",
    publisher: "Houghton Mifflin Harcourt",
    year: 1937,
    pages: 310,
    description:
      "Bilbo Baggins, a comfort-loving hobbit, is swept into a quest for treasure guarded by the dragon Smaug, discovering courage he never knew he had.",
    authors: ["J.R.R. Tolkien"],
    genres: ["Fantasy", "Adventure"],
    copies: 5,
  },
  {
    title: "Harry Potter and the Sorcerer's Stone",
    isbn: "9780590353427",
    publisher: "Scholastic",
    year: 1997,
    pages: 309,
    description:
      "On his eleventh birthday, Harry Potter learns he is a wizard and is whisked away to Hogwarts School of Witchcraft and Wizardry, where friendship and danger await.",
    authors: ["J.K. Rowling"],
    genres: ["Fantasy", "Young Adult"],
    copies: 8,
  },
  {
    title: "The Lord of the Rings",
    isbn: "9780618640157",
    publisher: "Houghton Mifflin",
    year: 1954,
    pages: 1178,
    description:
      "Frodo Baggins inherits a ring of terrible power and must carry it across Middle-earth to the fires of Mount Doom, aided by the Fellowship of the Ring.",
    authors: ["J.R.R. Tolkien"],
    genres: ["Fantasy", "Adventure"],
    copies: 6,
  },
  {
    title: "Brave New World",
    isbn: "9780060850524",
    publisher: "Harper Perennial",
    year: 1932,
    pages: 288,
    description:
      "Aldous Huxley's vision of a future society engineered for stability, where pleasure is mandatory and freedom, family and faith have been engineered away.",
    authors: ["Aldous Huxley"],
    genres: ["Science Fiction", "Dystopian", "Classics"],
    copies: 3,
  },
  {
    title: "The Catcher in the Rye",
    isbn: "9780316769488",
    publisher: "Little, Brown",
    year: 1951,
    pages: 277,
    description:
      "Holden Caulfield wanders New York City for a few days after being expelled, narrating a funny, heartbreaking portrait of adolescent grief and disillusionment.",
    authors: ["J.D. Salinger"],
    genres: ["Classics", "Literary Fiction"],
    copies: 3,
  },
  {
    title: "Fahrenheit 451",
    isbn: "9781451673319",
    publisher: "Simon & Schuster",
    year: 1953,
    pages: 249,
    description:
      "In a future where books are banned and firemen burn any that are found, Guy Montag begins to question the world around him after meeting a free-thinking neighbour.",
    authors: ["Ray Bradbury"],
    genres: ["Science Fiction", "Dystopian", "Classics"],
    copies: 3,
  },
  {
    title: "Jane Eyre",
    isbn: "9780141441146",
    publisher: "Penguin Classics",
    year: 1847,
    pages: 532,
    description:
      "An orphaned governess asserts her independence and dignity in a world determined to deny her both, in Charlotte Bronte's landmark novel of love and self-respect.",
    authors: ["Charlotte Bronte"],
    genres: ["Classics", "Romance", "Literary Fiction"],
    copies: 3,
  },
  {
    title: "Moby-Dick",
    isbn: "9780142437247",
    publisher: "Penguin Classics",
    year: 1851,
    pages: 654,
    description:
      "Captain Ahab's monomaniacal hunt for the white whale that took his leg drives Herman Melville's vast, philosophical epic of the sea.",
    authors: ["Herman Melville"],
    genres: ["Classics", "Adventure"],
    copies: 2,
  },
  {
    title: "The Alchemist",
    isbn: "9780062315007",
    publisher: "HarperOne",
    year: 1988,
    pages: 197,
    description:
      "Andalusian shepherd boy Santiago journeys to the Egyptian pyramids in search of treasure, learning to read the omens of the world along the way.",
    authors: ["Paulo Coelho"],
    genres: ["Fiction", "Adventure", "Philosophy"],
    copies: 5,
  },
  {
    title: "Gone Girl",
    isbn: "9780307588371",
    publisher: "Crown",
    year: 2012,
    pages: 415,
    description:
      "When Amy Dunne disappears on her fifth wedding anniversary, suspicion falls on her husband Nick. Told in alternating voices, this is a razor-edged mystery about marriage.",
    authors: ["Gillian Flynn"],
    genres: ["Mystery", "Thriller"],
    copies: 4,
  },
  {
    title: "The Girl with the Dragon Tattoo",
    isbn: "9780307949486",
    publisher: "Vintage",
    year: 2005,
    pages: 672,
    description:
      "Disgraced journalist Mikael Blomkvist and hacker Lisbeth Salander investigate a decades-old disappearance in the Vanger family's dark history.",
    authors: ["Stieg Larsson"],
    genres: ["Mystery", "Thriller", "Crime"],
    copies: 4,
  },
  {
    title: "A Brief History of Time",
    isbn: "9780553380163",
    publisher: "Bantam",
    year: 1988,
    pages: 212,
    description:
      "Stephen Hawking explains black holes, the Big Bang and the nature of time for a general audience, with remarkable clarity and almost no equations.",
    authors: ["Stephen Hawking"],
    genres: ["Science", "Nonfiction"],
    copies: 2,
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    isbn: "9780062316097",
    publisher: "Harper",
    year: 2011,
    pages: 443,
    description:
      "Yuval Noah Harari traces how Homo sapiens came to dominate the planet, from foraging bands to empires, money and the scientific revolution.",
    authors: ["Yuval Noah Harari"],
    genres: ["History", "Nonfiction", "Science"],
    copies: 5,
  },
  {
    title: "Educated",
    isbn: "9780399590504",
    publisher: "Random House",
    year: 2018,
    pages: 334,
    description:
      "Tara Westover grew up survivalist in Idaho with no schooling. Her account of leaving home to earn a Cambridge PhD is a story about the power of education.",
    authors: ["Tara Westover"],
    genres: ["Memoir", "Nonfiction", "Biography"],
    copies: 3,
  },
  {
    title: "The Diary of a Young Girl",
    isbn: "9780553577129",
    publisher: "Bantam",
    year: 1947,
    pages: 283,
    description:
      "Anne Frank's diary, written while in hiding from the Nazis in Amsterdam, remains one of the most moving and widely read testimonies of the Holocaust.",
    authors: ["Anne Frank"],
    genres: ["History", "Memoir", "Nonfiction"],
    copies: 3,
  },
  {
    title: "Thinking, Fast and Slow",
    isbn: "9780374533557",
    publisher: "Farrar, Straus and Giroux",
    year: 2011,
    pages: 499,
    description:
      "Nobel laureate Daniel Kahneman explores the two systems that drive how we think: fast intuition and slow, deliberate reasoning, and where they mislead us.",
    authors: ["Daniel Kahneman"],
    genres: ["Psychology", "Nonfiction", "Science"],
    copies: 2,
  },
  {
    title: "The Hobbit's Companion: Exploring Middle-earth",
    isbn: "9780316329408",
    publisher: "Houghton Mifflin",
    year: 2013,
    pages: 400,
    description: "An illustrated companion examining the geography, languages and peoples behind Tolkien's beloved adventure.",
    authors: ["Brian Sibley"],
    genres: ["Fantasy", "Nonfiction"],
    copies: 1,
  },
  {
    title: "Dune",
    isbn: "9780441013593",
    publisher: "Ace",
    year: 1965,
    pages: 688,
    description:
      "On the desert planet Arrakis, young Paul Atreides is drawn into a struggle over the galaxy's most valuable substance, the spice melange.",
    authors: ["Frank Herbert"],
    genres: ["Science Fiction", "Adventure"],
    copies: 5,
  },
  {
    title: "The Kite Runner",
    isbn: "9781594631931",
    publisher: "Riverhead Books",
    year: 2003,
    pages: 371,
    description:
      "A story of friendship and betrayal set against the fall of Kabul, as Amir returns to Afghanistan to make amends for a childhood wrong.",
    authors: ["Khaled Hosseini"],
    genres: ["Fiction", "Literary Fiction"],
    copies: 3,
  },
  {
    title: "Life of Pi",
    isbn: "9780156027328",
    publisher: "Mariner Books",
    year: 2001,
    pages: 326,
    description:
      "After a shipwreck, a young Indian boy shares a lifeboat with a Bengal tiger, drifting across the Pacific in this Booker Prize-winning novel.",
    authors: ["Yann Martel"],
    genres: ["Fiction", "Adventure", "Literary Fiction"],
    copies: 3,
  },
  {
    title: "The Handmaid's Tale",
    isbn: "9780385490818",
    publisher: "Anchor",
    year: 1985,
    pages: 311,
    description:
      "In the theocratic republic of Gilead, Offred is forced into childbearing for the ruling class. Margaret Atrod's warning about the erosion of women's rights.",
    authors: ["Margaret Atwood"],
    genres: ["Science Fiction", "Dystopian", "Literary Fiction"],
    copies: 3,
  },
  {
    title: "Becoming",
    isbn: "9781524763138",
    publisher: "Crown",
    year: 2018,
    pages: 448,
    description: "Michelle Obama's memoir charting her journey from the South Side of Chicago to the White House.",
    authors: ["Michelle Obama"],
    genres: ["Memoir", "Biography", "Nonfiction"],
    copies: 4,
  },
  {
    title: "The Silent Patient",
    isbn: "9781250301697",
    publisher: "Celadon Books",
    year: 2019,
    pages: 336,
    description:
      "A famous painter shoots her husband five times and then never speaks again. A criminal psychotherapist becomes obsessed with uncovering her motive.",
    authors: ["Alex Michaelides"],
    genres: ["Thriller", "Mystery"],
    copies: 4,
  },
  {
    title: "Atomic Habits",
    isbn: "9780735211292",
    publisher: "Avery",
    year: 2018,
    pages: 320,
    description:
      "James Clear's framework for building good habits and breaking bad ones through small, compounding improvements rather than dramatic overhauls.",
    authors: ["James Clear"],
    genres: ["Self Help", "Nonfiction", "Psychology"],
    copies: 6,
  },
  {
    title: "Where the Crawdads Sing",
    isbn: "9780735219090",
    publisher: "G.P. Putnam's Sons",
    year: 2018,
    pages: 384,
    description:
      "Raised alone in the North Carolina marsh, Kya Clark becomes a suspect in a death investigation in this luminous novel of isolation and nature.",
    authors: ["Delia Owens"],
    genres: ["Fiction", "Mystery", "Literary Fiction"],
    copies: 5,
  },
  {
    title: "The Name of the Wind",
    isbn: "9780756404741",
    publisher: "DAW Books",
    year: 2007,
    pages: 662,
    description:
      "Kvothe, now an innkeeper, recounts his rise from troupe child to the most notorious wizard his world has seen, in search of the mythical Chandrian.",
    authors: ["Patrick Rothfuss"],
    genres: ["Fantasy", "Adventure"],
    copies: 3,
  },
  {
    title: "Norwegian Wood",
    isbn: "9780375704024",
    publisher: "Vintage",
    year: 1987,
    pages: 296,
    description: "Haruki Murakami's tender novel of loss, memory and first love in 1960s Tokyo.",
    authors: ["Haruki Murakami"],
    genres: ["Fiction", "Literary Fiction", "Romance"],
    copies: 2,
  },
];

/**
 * Shelf category per title. Kept as one table rather than a field on every
 * entry so the 31 book definitions stay readable - and so a category can be
 * re-shelved in one place.
 */
const CATEGORY_BY_TITLE: Record<string, string> = {
  "The Great Gatsby": "Fiction",
  "To Kill a Mockingbird": "Fiction",
  "1984": "Science Fiction & Fantasy",
  "Pride and Prejudice": "Fiction",
  "The Hobbit": "Science Fiction & Fantasy",
  "Harry Potter and the Sorcerer's Stone": "Children's",
  "The Lord of the Rings": "Science Fiction & Fantasy",
  "Brave New World": "Science Fiction & Fantasy",
  "The Catcher in the Rye": "Fiction",
  "Fahrenheit 451": "Science Fiction & Fantasy",
  "Jane Eyre": "Fiction",
  "Moby-Dick": "Fiction",
  "The Alchemist": "Fiction",
  "Gone Girl": "Mystery & Thriller",
  "The Girl with the Dragon Tattoo": "Mystery & Thriller",
  "A Brief History of Time": "Science & Technology",
  "Sapiens: A Brief History of Humankind": "History & Politics",
  Educated: "Biography & Memoir",
  "The Diary of a Young Girl": "Biography & Memoir",
  "Thinking, Fast and Slow": "Science & Technology",
  "The Hobbit's Companion: Exploring Middle-earth": "Arts & Culture",
  Dune: "Science Fiction & Fantasy",
  "The Kite Runner": "Fiction",
  "Life of Pi": "Fiction",
  "The Handmaid's Tale": "Science Fiction & Fantasy",
  Becoming: "Biography & Memoir",
  "The Silent Patient": "Mystery & Thriller",
  "Atomic Habits": "Self-Help & Health",
  "Where the Crawdads Sing": "Fiction",
  "The Name of the Wind": "Science Fiction & Fantasy",
  "Norwegian Wood": "Fiction",
};

const ANNOUNCEMENTS = [
  {
    title: "Summer Reading Challenge 2026",
    excerpt: "Read six books before September and earn a limited-edition library tote bag.",
    body: "Our Summer Reading Challenge is back. Register at the front desk or from your account page, then log six titles before 1 September.\n\nEvery completed book earns an entry into the grand prize draw, and everyone who finishes receives a limited-edition library tote bag. Participants under 16 can join the Junior Challenge, which asks for four books.\n\nStaff picks are on display near the entrance, and the reading log is available from your account page once you enrol.",
    pinned: true,
  },
  {
    title: "New opening hours from March",
    excerpt: "We are staying open until 8pm on Thursdays during term time.",
    body: "Following feedback from students and evening classes, the reading rooms will now stay open until 8pm on Thursdays for the rest of the academic year.\n\nAll other hours are unchanged. Self-service returns remain available outside staffed hours at the drop box beside the main entrance.",
    pinned: false,
  },
  {
    title: "Overdue amnesty fortnight",
    excerpt: "Return overdue books between the 1st and 14th and your fines will be waived.",
    body: "For two weeks from the 1st, bring back any overdue items and we will waive the associated charges entirely.\n\nThis applies to all standard loan items. Damaged or lost items are not covered, but please do speak to a member of staff if you have lost a book and we will do what we can to help.",
    pinned: false,
  },
  {
    title: "Digital archive now available",
    excerpt: "Access local newspaper archives and academic journals from any computer in the building.",
    body: "Our new digital archive gives every member free access to local newspaper records going back to 1820, along with a wide selection of academic journals.\n\nSign in with your membership number on any terminal inside the building. Remote access is planned for later in the year and will be announced here.",
    pinned: false,
  },
];

async function main() {
  console.log("Seeding database...");

  // Wipe in dependency order.
  await db.notification.deleteMany();
  await db.fine.deleteMany();
  await db.loanEvent.deleteMany();
  await db.loan.deleteMany();
  await db.review.deleteMany();
  await db.bookCopy.deleteMany();
  await db.bookAuthor.deleteMany();
  await db.bookGenre.deleteMany();
  await db.book.deleteMany();
  await db.author.deleteMany();
  await db.genre.deleteMany();
  await db.announcement.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  // --- Users -------------------------------------------------------------
  const passwordHash = await hash("password123", 12);
  const admin = await db.user.create({
    data: {
      name: "Aalyana Audrey",
      email: "admin@library.test",
      passwordHash,
      role: "ADMIN",
      memberNo: "LIB-000001",
      address: "12 Reading Lane",
      phone: "555-0100",
    },
  });
  const librarian = await db.user.create({
    data: {
      name: "Sam Whitfield",
      email: "librarian@library.test",
      passwordHash,
      role: "LIBRARIAN",
      memberNo: "LIB-000002",
    },
  });
  const member = await db.user.create({
    data: {
      name: "Jordan Reyes",
      email: "member@library.test",
      passwordHash,
      role: "MEMBER",
      memberNo: "LIB-000003",
      phone: "555-0142",
      address: "48 Folio Street",
    },
  });
  const member2 = await db.user.create({
    data: {
      name: "Priya Nair",
      email: "priya@library.test",
      passwordHash,
      role: "MEMBER",
      memberNo: "LIB-000004",
    },
  });

  // --- Genres & authors --------------------------------------------------
  const genreNames = Array.from(
    new Set(BOOKS.flatMap((b) => b.genres)),
  ).sort();
  const genres: Record<string, string> = {};
  for (const name of genreNames) {
    const g = await db.genre.create({
      data: { name, slug: slugify(name) },
    });
    genres[name] = g.id;
  }

  const authorNames = Array.from(new Set(BOOKS.flatMap((b) => b.authors))).sort();
  const authors: Record<string, string> = {};
  for (const name of authorNames) {
    const a = await db.author.create({
      data: { name, slug: slugify(name) },
    });
    authors[name] = a.id;
  }

  // --- Books -------------------------------------------------------------
  // Barcodes must be globally unique. Truncating a slug is not safe on its own
  // ("The Hobbit" and "The Hobbit's Companion" both start "the-ho"), so a
  // monotonically increasing sequence number is appended.
  let barcodeSeq = 0;

  for (const b of BOOKS) {
    const slug = slugify(b.title);
    const copies = b.copies ?? 2;

    const book = await db.book.create({
      data: {
        title: b.title,
        slug,
        isbn: b.isbn ?? null,
        publisher: b.publisher ?? null,
        year: b.year ?? null,
        pages: b.pages ?? null,
        description: b.description,
        coverUrl: b.isbn ? cover(b.isbn) : null,
        status: "AVAILABLE",
        category: CATEGORY_BY_TITLE[b.title] ?? "Fiction",
        borrowFeeCents: b.borrowFeeCents ?? 0,
        rentalFeeCents: b.rentalFeeCents ?? null,
        overdueFinePerDayCents: 50,
        authors: {
          create: b.authors.map((n) => ({ authorId: authors[n] })),
        },
        genres: {
          create: b.genres.map((n) => ({ genreId: genres[n] })),
        },
        copies: {
          create: Array.from({ length: copies }, () => {
            barcodeSeq += 1;
            return {
              barcode: `BC-${String(barcodeSeq).padStart(5, "0")}`,
              status: "AVAILABLE",
            };
          }),
        },
      },
    });

    // One sample review on a handful of titles so ratings are not all empty.
    if (Math.abs(slug.length % 3) === 0) {
      await db.review.create({
        data: {
          userId: member.id,
          bookId: book.id,
          rating: 4 + (slug.length % 2),
          title: "Worth the read",
          body: "Kept me engaged from start to finish. Would happily borrow it again.",
        },
      });
    }
  }

  // --- Announcements ------------------------------------------------------
  for (const a of ANNOUNCEMENTS) {
    await db.announcement.create({
      data: {
        title: a.title,
        slug: slugify(a.title),
        excerpt: a.excerpt,
        body: a.body,
        pinned: a.pinned,
        publishedAt: new Date(),
      },
    });
  }

  // --- A little history so the dashboard is not empty ---------------------
  const someBook = await db.book.findFirst({ where: { title: "1984" } });
  if (someBook) {
    const copy = await db.bookCopy.findFirst({ where: { bookId: someBook.id } });
    const loan = await db.loan.create({
      data: {
        userId: member2.id,
        bookId: someBook.id,
        copyId: copy?.id,
        type: "BORROW",
        status: "ACTIVE",
        periodWeeks: 2,
        approvedAt: new Date(Date.now() - 3 * 86_400_000),
        startedAt: new Date(Date.now() - 3 * 86_400_000),
        dueAt: new Date(Date.now() + 11 * 86_400_000),
      },
    });
    await db.loanEvent.create({
      data: { loanId: loan.id, from: "PENDING", to: "APPROVED", actorId: admin.id, note: "Approved at desk" },
    });
    await db.loanEvent.create({
      data: { loanId: loan.id, from: "APPROVED", to: "ACTIVE", actorId: admin.id, note: "Collected by member" },
    });
    if (copy) await db.bookCopy.update({ where: { id: copy.id }, data: { status: "ON_LOAN" } });
    await db.book.update({
      where: { id: someBook.id },
      data: {
        status:
          (await db.bookCopy.count({ where: { bookId: someBook.id, status: "AVAILABLE" } })) > 0
            ? "AVAILABLE"
            : "BORROWED",
      },
    });
  }

  const pendingBook = await db.book.findFirst({ where: { title: "Dune" } });
  if (pendingBook) {
    const loan = await db.loan.create({
      data: {
        userId: member.id,
        bookId: pendingBook.id,
        type: "RENTAL",
        status: "PENDING",
        periodWeeks: 3,
        feeCents: 450,
      },
    });
    await db.loanEvent.create({
      data: { loanId: loan.id, from: null, to: "PENDING", actorId: member.id, note: "Request submitted" },
    });
  }

  const counts = {
    books: await db.book.count(),
    authors: await db.author.count(),
    genres: await db.genre.count(),
    copies: await db.bookCopy.count(),
    users: await db.user.count(),
    loans: await db.loan.count(),
    announcements: await db.announcement.count(),
    reviews: await db.review.count(),
  };

  console.log("\nSeed complete:");
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${v}`));
  console.log("\nDemo accounts (password: password123):");
  console.log("  admin@library.test      ADMIN");
  console.log("  librarian@library.test  LIBRARIAN");
  console.log("  member@library.test     MEMBER");
  console.log("  priya@library.test      MEMBER");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
