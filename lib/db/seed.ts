/**
 * lib/db/seed.ts
 *
 * Idempotent seed script to populate canonical colleges, courses, jobs,
 * campus drives, and recruiter users.
 *
 * Enforces §5 requirements. Can be run multiple times safely.
 */

try {
  process.loadEnvFile?.('.env.local')
} catch {}

import { getDb } from './client'
import { colleges, courses, jobs, users, campusDrives } from './schema'
import { eq, and, sql } from 'drizzle-orm'

import { hashPassword } from '../auth/password'

async function seed() {
  console.log('Starting database seeding...')
  const db = getDb()

  // ── 1. Users (Recruiters & Admins) ──────────────────────────────────────────
  console.log('Seeding users...')
  const defaultHash = await hashPassword('DemoPassword@123')
  // Must match scripts/seed-admin.ts and scripts/set-admin-password.ts's
  // default — see F14 (2026-08-11 verification campaign): three sibling
  // admin-bootstrap paths disagreeing on this default is exactly what broke
  // P0 IDOR verification the first time, and a fourth path (this file) was
  // still wrong when that got re-discovered during final re-verification.
  const adminHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin@123')

  const seedUsers = [
    {
      email: 'admin@gmail.com',
      name: 'System Super Admin',
      passwordHash: adminHash,
      role: 'super_admin' as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'recruiter1@akshara.in',
      name: 'Ramesh Kumar',
      passwordHash: defaultHash,
      role: 'recruiter' as const,
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: 'admin@akshara.in',
      name: 'Priya Sharma',
      passwordHash: defaultHash,
      role: 'admin' as const,
      isActive: true,
      mustChangePassword: false,
    },
  ]

  for (const u of seedUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          passwordHash: u.passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      })
  }

  // ── 2. Courses (Canonical) ──────────────────────────────────────────────────
  console.log('Seeding courses...')
  const seedCourses = [
    {
      name: 'MBA',
      specialisation: 'Marketing & Sales',
      level: 'postgraduate' as const,
      aliases: ['M.B.A', 'Master of Business Administration', 'MBA Marketing'],
      isVerified: true,
    },
    {
      name: 'B.Com',
      specialisation: 'General',
      level: 'undergraduate' as const,
      aliases: ['BCom', 'Bachelor of Commerce', 'B. Commerce'],
      isVerified: true,
    },
    {
      name: 'BBA',
      specialisation: 'Finance',
      level: 'undergraduate' as const,
      aliases: ['B.B.A', 'Bachelor of Business Administration', 'BBA Finance'],
      isVerified: true,
    },
  ]

  for (const c of seedCourses) {
    // Check if course exists to keep it idempotent
    const existing = await db
      .select()
      .from(courses)
      .where(and(eq(courses.name, c.name), eq(courses.level, c.level)))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(courses).values(c)
    } else {
      const id = existing[0]?.id
      if (id) {
        await db
          .update(courses)
          .set({ aliases: c.aliases, isVerified: c.isVerified })
          .where(eq(courses.id, id))
      }
    }
  }

  // ── 3. Colleges (28 Canonical + Aliases matching 47 variations) ──────────────
  console.log('Seeding colleges...')
  const seedColleges = [
    {
      name: 'Government First Grade College, Yelahanka',
      city: 'Yelahanka',
      state: 'Karnataka',
      aliases: [
        'GFGC Yelahanka',
        'Gfgc Yelahanka',
        'GFGC yelahanka',
        'Government first grade college Yelahanka',
        'gfgc yela',
        'Government First Grade College Yelahanka',
      ],
      isVerified: true,
    },
    {
      name: 'Government First Grade College, Kengeri',
      city: 'Kengeri',
      state: 'Karnataka',
      aliases: ['GFGC Kengeri', 'Government First Grade College Kengeri', 'Gfgc Kengeri'],
      isVerified: true,
    },
    {
      name: 'Government First Grade College, Varthur',
      city: 'Varthur',
      state: 'Karnataka',
      aliases: ['GFGC Varthur', 'Government First Grade College Varthur', 'Gfgc Varthur'],
      isVerified: true,
    },
    {
      name: 'Government First Grade College, K.R. Puram',
      city: 'K.R. Puram',
      state: 'Karnataka',
      aliases: ['GFGC KR Puram', 'Government First Grade College KR Puram', 'Gfgc KR Puram'],
      isVerified: true,
    },
    {
      name: 'Government First Grade College, Vijayanagar',
      city: 'Vijayanagar',
      state: 'Karnataka',
      aliases: ['GFGC Vijayanagar', 'Government First Grade College Vijayanagar', 'Gfgc Vijayanagar'],
      isVerified: true,
    },
    {
      name: 'Government First Grade College, Malleshwaram',
      city: 'Malleshwaram',
      state: 'Karnataka',
      aliases: ['GFGC Malleshwaram', 'Government First Grade College Malleshwaram', 'Gfgc Malleshwaram'],
      isVerified: true,
    },
    {
      name: 'Acharya Institute of Technology',
      city: 'Soladevanahalli',
      state: 'Karnataka',
      aliases: ['AIT', 'Acharya College', 'Acharya Tech'],
      isVerified: true,
    },
    {
      name: 'M.S. Ramaiah College of Arts, Science and Commerce',
      city: 'Mathikere',
      state: 'Karnataka',
      aliases: ['MS Ramaiah College', 'Ramaiah Arts', 'MSRCASC'],
      isVerified: true,
    },
    {
      name: 'St. Joseph\'s College of Commerce',
      city: 'Ashok Nagar',
      state: 'Karnataka',
      aliases: ['SJCC', 'St Josephs Commerce', 'Josephs BCom'],
      isVerified: true,
    },
    {
      name: 'Mount Carmel College',
      city: 'Vasanth Nagar',
      state: 'Karnataka',
      aliases: ['MCC', 'Mount Carmel', 'MCC Bangalore'],
      isVerified: true,
    },
    {
      name: 'Christ University',
      city: 'Hosur Road',
      state: 'Karnataka',
      aliases: ['Christ College', 'Christ Bangalore', 'CU'],
      isVerified: true,
    },
    {
      name: 'Bangalore University',
      city: 'Jnanabharathi',
      state: 'Karnataka',
      aliases: ['BU', 'Bangalore Uni'],
      isVerified: true,
    },
    {
      name: 'PES University',
      city: 'Banashankari',
      state: 'Karnataka',
      aliases: ['PESIT', 'PES Bangalore', 'PESU'],
      isVerified: true,
    },
    {
      name: 'R.V. College of Engineering',
      city: 'Mysore Road',
      state: 'Karnataka',
      aliases: ['RVCE', 'RV College', 'RV Engineering'],
      isVerified: true,
    },
    {
      name: 'B.M.S. College of Engineering',
      city: 'Basavanagudi',
      state: 'Karnataka',
      aliases: ['BMSCE', 'BMS College', 'BMS Engineering'],
      isVerified: true,
    },
    {
      name: 'Dayananda Sagar College of Engineering',
      city: 'Kumaraswamy Layout',
      state: 'Karnataka',
      aliases: ['DSCE', 'Dayananda Sagar', 'Dayanand Sagar Engineering'],
      isVerified: true,
    },
    {
      name: 'Reva University',
      city: 'Yelahanka',
      state: 'Karnataka',
      aliases: ['Reva', 'Reva College', 'REVA'],
      isVerified: true,
    },
    {
      name: 'Presidency University',
      city: 'Yelahanka',
      state: 'Karnataka',
      aliases: ['Presidency', 'Presidency College', 'Presidency Bangalore'],
      isVerified: true,
    },
    {
      name: 'Alliance University',
      city: 'Anekal',
      state: 'Karnataka',
      aliases: ['Alliance', 'Alliance College', 'Alliance Business School'],
      isVerified: true,
    },
    {
      name: 'Kristu Jayanti College',
      city: 'Kothanur',
      state: 'Karnataka',
      aliases: ['KJC', 'Kristu Jayanti', 'Kristu Jayanthi'],
      isVerified: true,
    },
    {
      name: 'Jyoti Nivas College',
      city: 'Koramangala',
      state: 'Karnataka',
      aliases: ['JNC', 'Jyoti Nivas', 'Jyoti Nivas Women\'s College'],
      isVerified: true,
    },
    {
      name: 'Maharani Cluster University',
      city: 'Seshadripuram',
      state: 'Karnataka',
      aliases: ['Maharani College', 'Maharani University', 'Maharani Science College'],
      isVerified: true,
    },
    {
      name: 'NMKRV College for Women',
      city: 'Jayanagar',
      state: 'Karnataka',
      aliases: ['NMKRV', 'NMKRV College', 'NMKRV Jayanagar'],
      isVerified: true,
    },
    {
      name: 'National College, Jayanagar',
      city: 'Jayanagar',
      state: 'Karnataka',
      aliases: ['National College Jayanagar', 'NC Jayanagar'],
      isVerified: true,
    },
    {
      name: 'Bangalore Institute of Technology',
      city: 'V.V. Puram',
      state: 'Karnataka',
      aliases: ['BIT', 'BIT Bangalore', 'BIT Engineering'],
      isVerified: true,
    },
    {
      name: 'Oxford College of Science',
      city: 'HSR Layout',
      state: 'Karnataka',
      aliases: ['Oxford College', 'Oxford Science', 'Oxford HSR'],
      isVerified: true,
    },
    {
      name: 'K.L.E. Society\'s S. Nijalingappa College',
      city: 'Rajajinagar',
      state: 'Karnataka',
      aliases: ['KLE College', 'KLE S Nijalingappa', 'KLE Rajajinagar'],
      isVerified: true,
    },
    {
      name: 'Seshadripuram College',
      city: 'Seshadripuram',
      state: 'Karnataka',
      aliases: ['Seshadripuram', 'Seshadripuram Degree College', 'Seshadripuram Bangalore'],
      isVerified: true,
    },
  ]

  for (const col of seedColleges) {
    const canonicalNameLower = col.name.trim().toLowerCase()
    const cityLower = col.city.trim().toLowerCase()

    // Query using lower(btrim(name)) and lower(coalesce(city, '')) matching unique index
    const existing = await db
      .select()
      .from(colleges)
      .where(
        and(
          sql`lower(btrim(${colleges.name})) = ${canonicalNameLower}`,
          sql`lower(coalesce(${colleges.city}, '')) = ${cityLower}`
        )
      )
      .limit(1)

    if (existing.length === 0) {
      await db.insert(colleges).values(col)
    } else {
      const id = existing[0]?.id
      if (id) {
        await db
          .update(colleges)
          .set({ aliases: col.aliases, isVerified: col.isVerified })
          .where(eq(colleges.id, id))
      }
    }
  }

  // ── 4. Jobs (Roles) ─────────────────────────────────────────────────────────
  console.log('Seeding jobs...')
  const seedJobs = [
    {
      slug: 'business-development-executive',
      title: 'Business Development Executive',
      family: 'Sales',
      summary: 'Promote education loans to students and drive admissions conversions.',
      descriptionHtml: '<p>Join Akshara as a BDE and help students achieve their educational dreams.</p>',
      responsibilities: [
        'Visit partnered colleges and run presentations.',
        'Follow up with interested candidates on lead sheets.',
        'Explain loan products, interest rates, and repayment options.',
      ],
      requirements: [
        'Excellent Kannada and English communication skills.',
        'Must possess a personal two-wheeler and functional driving licence.',
        'High degree of empathy and customer service orientation.',
      ],
      niceToHave: ['Prior sales experience in BFSI or EdTech.'],
      benefits: ['Competitive sales incentives.', 'Fuel reimbursement.', 'Health insurance.'],
      employmentType: 'FULL_TIME' as const,
      workMode: 'field' as const,
      locationCity: 'Bengaluru',
      locationState: 'Karnataka',
      experienceMinYears: '0',
      experienceMaxYears: '2',
      salaryMin: 350000,
      salaryMax: 450000,
      salaryCurrency: 'INR',
      salaryUnit: 'YEAR',
      salaryIsPublic: false, // Per assumption 5
      requiresTwoWheeler: true,
      requiresDrivingLicence: true,
      openings: 5,
      status: 'open' as const,
      postedAt: new Date(),
      validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days out
    },
    {
      slug: 'operations-associate',
      title: 'Operations Associate',
      family: 'Operations',
      summary: 'Process loan applications, verify candidate details, and handle documentation.',
      descriptionHtml: '<p>Manage end-to-end loan application pipelines in operations.</p>',
      responsibilities: [
        'Review submitted applications and sniff resume integrity.',
        'Coordinate with credit team for loan approvals.',
        'Manage partner college relations and drive board details.',
      ],
      requirements: [
        'Strong organization skills and attention to detail.',
        'Proficient in Excel and database querying.',
        'Good communication in English and Kannada.',
      ],
      niceToHave: ['Familiarity with financial credit processing.'],
      benefits: ['Fixed weekend off.', 'PF benefits.', 'Annual performance bonuses.'],
      employmentType: 'FULL_TIME' as const,
      workMode: 'onsite' as const,
      locationCity: 'Bengaluru',
      locationState: 'Karnataka',
      experienceMinYears: '1',
      experienceMaxYears: '3',
      salaryMin: 300000,
      salaryMax: 400000,
      salaryCurrency: 'INR',
      salaryUnit: 'YEAR',
      salaryIsPublic: false,
      requiresTwoWheeler: false,
      requiresDrivingLicence: false,
      openings: 2,
      status: 'open' as const,
      postedAt: new Date(),
      validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const j of seedJobs) {
    await db
      .insert(jobs)
      .values(j)
      .onConflictDoUpdate({
        target: jobs.slug,
        set: {
          title: j.title,
          summary: j.summary,
          descriptionHtml: j.descriptionHtml,
          responsibilities: j.responsibilities,
          requirements: j.requirements,
          status: j.status,
        },
      })
  }

  // ── 5. Campus Drives ────────────────────────────────────────────────────────
  console.log('Seeding campus drives...')
  const ylkCollege = await db
    .select()
    .from(colleges)
    .where(eq(colleges.name, 'Government First Grade College, Yelahanka'))
    .limit(1)

  const bdeJob = await db
    .select()
    .from(jobs)
    .where(eq(jobs.slug, 'business-development-executive'))
    .limit(1)

  if (ylkCollege[0] && bdeJob[0]) {
    const allColleges = await db.select().from(colleges).limit(10)
    const rvce = allColleges.find((c) => c.name.includes('R.V.')) || ylkCollege[0]
    const bmsce = allColleges.find((c) => c.name.includes('B.M.S.')) || ylkCollege[0]
    const pes = allColleges.find((c) => c.name.includes('PES')) || ylkCollege[0]
    const ramaiah = allColleges.find((c) => c.name.includes('Ramaiah')) || ylkCollege[0]

    const seedDriveList = [
      {
        code: 'GFGC-YLK-0726',
        collegeId: ylkCollege[0].id,
        driveDate: '2026-08-25',
        venue: 'Main Seminar Hall, Ground Floor',
        jobIds: [bdeJob[0].id],
        seats: 120,
        status: 'upcoming' as const,
      },
      {
        code: 'RVCE-2026',
        collegeId: rvce.id,
        driveDate: '2026-08-28',
        venue: 'Auditorium Block A',
        jobIds: [bdeJob[0].id],
        seats: 60,
        status: 'upcoming' as const,
      },
      {
        code: 'BMSCE-2026',
        collegeId: bmsce.id,
        driveDate: '2026-09-02',
        venue: 'Placement Cell Hall 2',
        jobIds: [bdeJob[0].id],
        seats: 50,
        status: 'upcoming' as const,
      },
      {
        code: 'PES-2026',
        collegeId: pes.id,
        driveDate: '2026-09-10',
        venue: 'Golden Jubilee Block',
        jobIds: [bdeJob[0].id],
        seats: 80,
        status: 'upcoming' as const,
      },
      {
        code: 'MSRIT-2026',
        collegeId: ramaiah.id,
        driveDate: '2026-09-15',
        venue: 'Apex Seminar Hall',
        jobIds: [bdeJob[0].id],
        seats: 45,
        status: 'upcoming' as const,
      },
    ]

    for (const drive of seedDriveList) {
      await db
        .insert(campusDrives)
        .values(drive)
        .onConflictDoUpdate({
          target: campusDrives.code,
          set: {
            collegeId: drive.collegeId,
            driveDate: drive.driveDate,
            venue: drive.venue,
            seats: drive.seats,
            status: drive.status,
          },
        })
    }
  }

  console.log('Database seeding completed successfully!')
}

seed().catch((err) => {
  console.error('Database seeding failed:', err)
  process.exit(1)
})
