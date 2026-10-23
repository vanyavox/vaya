import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.calendarFeedToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.wish.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.coupleMember.deleteMany();
  await prisma.couple.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const passwordHash = await argon2.hash('password123');

  const yana = await prisma.user.create({
    data: {
      email: 'yana@example.com',
      passwordHash,
      name: 'Яна',
      timezone: 'Europe/Moscow',
    },
  });

  const vanya = await prisma.user.create({
    data: {
      email: 'vanya@example.com',
      passwordHash,
      name: 'Ваня',
      timezone: 'Europe/Moscow',
    },
  });

  // Couple
  const couple = await prisma.couple.create({
    data: {
      name: 'Вая',
      inviteCode: 'VAYA2026',
      members: {
        create: [
          { userId: yana.id, role: 'OWNER' },
          { userId: vanya.id, role: 'PARTNER' },
        ],
      },
    },
  });

  // Wishlists
  const birthdayList = await prisma.wishlist.create({
    data: {
      ownerId: yana.id,
      coupleId: couple.id,
      title: 'День рождения',
      description: 'Желания на день рождения',
      visibility: 'SHARED',
    },
  });

  const newList = await prisma.wishlist.create({
    data: {
      ownerId: vanya.id,
      title: 'На Новый год',
      description: 'Подарки на новый год',
      visibility: 'PERSONAL',
    },
  });

  // Wishes
  await prisma.wish.createMany({
    data: [
      {
        wishlistId: birthdayList.id,
        title: 'Книга «Атлант расправил плечи»',
        price: 1200,
        priority: 'HIGH',
        status: 'AVAILABLE',
        sortOrder: 0,
      },
      {
        wishlistId: birthdayList.id,
        title: 'Наушники Sony WH-1000XM5',
        price: 25000,
        priority: 'MEDIUM',
        status: 'RESERVED',
        reservedById: vanya.id,
        reservedAt: new Date(),
        sortOrder: 1,
      },
      {
        wishlistId: birthdayList.id,
        title: 'Свеча Yankee',
        price: 2500,
        priority: 'LOW',
        status: 'GIFTED',
        reservedById: vanya.id,
        sortOrder: 2,
      },
      {
        wishlistId: birthdayList.id,
        title: 'Абонемент в спа',
        price: 8000,
        priority: 'MEDIUM',
        status: 'AVAILABLE',
        sortOrder: 3,
      },
      {
        wishlistId: newList.id,
        title: 'Фотоальбом',
        price: 1500,
        priority: 'LOW',
        status: 'AVAILABLE',
        sortOrder: 0,
      },
      {
        wishlistId: newList.id,
        title: 'Кофемолка',
        price: 4500,
        priority: 'MEDIUM',
        status: 'AVAILABLE',
        sortOrder: 1,
      },
    ],
  });

  // Events
  const now = new Date();
  const july = (day: number, hour = 12) =>
    new Date(2026, 6, day, hour, 0, 0);

  await prisma.calendarEvent.createMany({
    data: [
      {
        icsUid: '550e8400-e29b-41d4-a716-446655440001',
        creatorId: yana.id,
        coupleId: couple.id,
        title: 'Ужин с друзьями',
        startsAt: july(2, 19),
        endsAt: july(2, 22),
        timezone: 'Europe/Moscow',
        kind: 'MEETING',
        color: '#6C5CE7',
      },
      {
        icsUid: '550e8400-e29b-41d4-a716-446655440002',
        creatorId: vanya.id,
        coupleId: couple.id,
        title: 'Годовщина',
        startsAt: july(10, 0),
        endsAt: july(11, 0),
        allDay: true,
        timezone: 'Europe/Moscow',
        kind: 'DATE',
        color: '#FD79A8',
      },
      {
        icsUid: '550e8400-e29b-41d4-a716-446655440003',
        creatorId: yana.id,
        title: 'Стоматолог',
        startsAt: july(12, 14),
        endsAt: july(12, 15),
        timezone: 'Europe/Moscow',
        kind: 'EVENT',
        color: '#00B894',
      },
      {
        icsUid: '550e8400-e29b-41d4-a716-446655440004',
        creatorId: vanya.id,
        coupleId: couple.id,
        title: 'Свидание',
        location: 'Кафе на Тверской',
        startsAt: july(18, 19),
        endsAt: july(18, 21),
        timezone: 'Europe/Moscow',
        kind: 'DATE',
        color: '#FD79A8',
      },
      {
        icsUid: '550e8400-e29b-41d4-a716-446655440005',
        creatorId: yana.id,
        coupleId: couple.id,
        title: 'День рождения Ани',
        startsAt: july(25, 0),
        endsAt: july(26, 0),
        allDay: true,
        timezone: 'Europe/Moscow',
        kind: 'HOLIDAY',
        color: '#E17055',
      },
    ],
  });

  // Tasks
  await prisma.task.createMany({
    data: [
      {
        coupleId: couple.id,
        creatorId: yana.id,
        assigneeId: yana.id,
        title: 'Купить продукты на неделю',
        category: 'SHOPPING',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(2026, 6, 16, 18, 0),
      },
      {
        coupleId: couple.id,
        creatorId: vanya.id,
        assigneeId: vanya.id,
        title: 'Вынести мусор',
        category: 'OTHER',
        status: 'TODO',
        priority: 'LOW',
        dueDate: new Date(2026, 6, 15),
      },
      {
        coupleId: couple.id,
        creatorId: yana.id,
        assigneeId: yana.id,
        title: 'Записаться к стоматологу',
        category: 'DOCS',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(2026, 6, 20),
      },
      {
        coupleId: couple.id,
        creatorId: vanya.id,
        assigneeId: vanya.id,
        title: 'Починить кран на кухне',
        category: 'REPAIRS',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(2026, 6, 25),
      },
      {
        coupleId: couple.id,
        creatorId: yana.id,
        assigneeId: yana.id,
        title: 'Убрать квартиру',
        category: 'CLEANING',
        status: 'DONE',
        priority: 'MEDIUM',
        dueDate: new Date(2026, 6, 15),
        completedAt: new Date(2026, 6, 15),
      },
      {
        coupleId: couple.id,
        creatorId: vanya.id,
        assigneeId: vanya.id,
        title: 'Оплатить интернет',
        category: 'FINANCE',
        status: 'TODO',
        priority: 'LOW',
        dueDate: new Date(2026, 6, 28),
      },
      {
        coupleId: couple.id,
        creatorId: vanya.id,
        assigneeId: vanya.id,
        title: 'Купить корм коту',
        category: 'PET',
        status: 'DONE',
        priority: 'LOW',
        dueDate: new Date(2026, 6, 14),
        completedAt: new Date(2026, 6, 14),
      },
      {
        coupleId: couple.id,
        creatorId: yana.id,
        assigneeId: yana.id,
        title: 'Забронировать ресторан',
        category: 'OTHER',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        dueDate: new Date(2026, 6, 18),
      },
    ],
  });

  console.log('Seed completed!');
  console.log('Users: yana@example.com / vanya@example.com (password: password123)');
  console.log('Invite code: VAYA2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
