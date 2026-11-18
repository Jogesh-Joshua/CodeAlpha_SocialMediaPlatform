// scripts/seed_demo.js
// Idempotent realistic demo content seeder for Nexus Social Media Platform
'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getPool } = require('../src/db/pool');

const DEMO_USERS = [
  {
    username: 'nexus_demo_alex',
    display_name: 'Alex Rivera',
    email: 'alex.rivera@demo.nexus.local',
    bio: 'Staff Engineer & OSS builder. Building scalable web platforms with Node.js & TypeScript. Keyboards & espresso. 💻☕',
  },
  {
    username: 'nexus_demo_elena',
    display_name: 'Elena Rostova',
    email: 'elena.rostova@demo.nexus.local',
    bio: 'Principal Product Designer. Design systems, human-centered UX, and micro-interactions. Typography enthusiast. 🎨✨',
  },
  {
    username: 'nexus_demo_marcus',
    display_name: 'Marcus Chen',
    email: 'marcus.chen@demo.nexus.local',
    bio: 'CS Junior @ State Tech. Passionate about AI, autonomous rovers, and hackathons. Late night coder. 🚀🎓',
  },
  {
    username: 'nexus_demo_sophia',
    display_name: 'Sophia Martinez',
    email: 'sophia.martinez@demo.nexus.local',
    bio: 'Landscape & architectural photographer. Golden hour chaser across mountain peaks & city skylines. 📷🏔️',
  },
  {
    username: 'nexus_demo_david',
    display_name: 'David Kim',
    email: 'david.kim@demo.nexus.local',
    bio: 'Full-Stack Developer & cloud architect. Exploring serverless backends and reactive web apps. ⚡',
  },
  {
    username: 'nexus_demo_maya',
    display_name: 'Maya Patel',
    email: 'maya.patel@demo.nexus.local',
    bio: 'Travel photographer & culture explorer. 24 countries and counting. Storytelling through visual frames. ✈️🌍',
  },
  {
    username: 'nexus_demo_liam',
    display_name: 'Liam Vance',
    email: 'liam.vance@demo.nexus.local',
    bio: 'Robotics builder & hardware tinkerer. Microcontrollers, custom PCBs, and 3D printing. Let us make things fly. 🤖🔧',
  },
  {
    username: 'nexus_demo_chloe',
    display_name: 'Chloe Bennett',
    email: 'chloe.bennett@demo.nexus.local',
    bio: 'Creative director & indie publisher. Coffee aficionado, interior lover, and journal collector. 🌿☕📖',
  },
];

const DEMO_POSTS = [
  {
    user: 'nexus_demo_alex',
    content: 'Just open-sourced our real-time streaming pipeline built on Express 5 and PostgreSQL! Handles 50k req/min smoothly on low-memory containers. Link in bio! 🚀 #WebDev #NodeJS #OpenSource #Performance',
    image_url: '/images/demo/tech-workspace.jpg',
  },
  {
    user: 'nexus_demo_elena',
    content: 'Design System 2.0 is officially shipped. Standardized typography scales, accessible color contrast (WCAG AAA), and custom fluid spacing. What do you think of this layout flow? 🎨📐 #DesignSystem #UIUX #Figma #ProductDesign',
    image_url: '/images/demo/ui-design.jpg',
  },
  {
    user: 'nexus_demo_marcus',
    content: 'Final sprint week before university demo day! The campus library floor 4 has been home for 72 hours. Our team distributed drone delivery system is almost ready. 📚🔋 #CampusLife #StudentLife #TechUniv #Engineering',
    image_url: '/images/demo/campus-library.jpg',
  },
  {
    user: 'nexus_demo_sophia',
    content: 'Sunrise above the Alpine clouds at 9,200ft. The cold was brutal, but waiting three hours for this light made every second worthwhile. Raw file, zero saturation boost. 🏔️✨ #Photography #Nature #MountainView #GoldenHour #Wilderness',
    image_url: '/images/demo/mountain-sunset.jpg',
  },
  {
    user: 'nexus_demo_david',
    content: 'Clean architectural lines in the financial district this morning. Reflective glass against concrete gives such a futuristic rhythm to the morning commute. 🏙️📷 #UrbanPhotography #Architecture #Cityscape #ModernDesign',
    image_url: '/images/demo/urban-architecture.jpg',
  },
  {
    user: 'nexus_demo_chloe',
    content: 'Morning rituals: dialing in this Ethiopian pour-over while sketching new branding concepts. Slow mornings before intense creative work keep the mind grounded. ☕🌿 #CoffeeArt #MorningRoutine #CreativeSpace #Mindfulness',
    image_url: '/images/demo/coffee-art.jpg',
  },
  {
    user: 'nexus_demo_liam',
    content: 'First autonomous obstacle avoidance test with our ROS 2 rover! Running an ESP32 alongside an optical flow sensor. Hardware debugging is tough but so rewarding when it works! 🤖⚙️ #Robotics #IoT #Hardware #Engineering #Makers',
    image_url: '/images/demo/robotics-project.jpg',
  },
  {
    user: 'nexus_demo_maya',
    content: 'Lost in the pine forests of the Pacific Northwest. Fresh cedar scent, quiet trails, and the sound of distant waterfalls. Nature is the best reset button. 🌲🥾 #HikingTrail #Wanderlust #TravelDiaries #Adventure #Outdoors',
    image_url: '/images/demo/hiking-trail.jpg',
  },
  {
    user: 'nexus_demo_elena',
    content: 'My home studio setup for the week. Fresh palette swatches, mechanical pencil sketches, and a clean workspace. Creativity needs both discipline and room to breathe. ✏️🖼️ #CreativeStudio #WorkspaceGoals #DesignInspiration',
    image_url: '/images/demo/creative-studio.jpg',
  },
  {
    user: 'nexus_demo_marcus',
    content: 'Hackathon champions! 48 hours of intense coding, 3 bug-fixing meltdowns, and endless pizza. Proud of what our squad built together. 🏆🎉 #Hackathon #TeamWork #CollegeLife #DeveloperSquad',
    image_url: '/images/demo/team-collaboration.jpg',
  },
  {
    user: 'nexus_demo_alex',
    content: 'A friendly reminder for every engineer: premature optimization is the root of all evil. Build it clean first, measure with actual profilers, and optimize only where the bottleneck hurts. #SoftwareEngineering #Architecture #CodeTips',
    image_url: null,
  },
  {
    user: 'nexus_demo_david',
    content: 'The best feature of a good codebase is deletion. Deleted 1,200 lines of legacy boilerplate today and replaced it with a 40-line declarative pipeline. Pure bliss. 🧹✨ #CodeQuality #Refactoring #CleanCode',
    image_url: null,
  },
  {
    user: 'nexus_demo_maya',
    content: 'Solo travel taught me that strangers are just friends you have not met yet. Never hesitate to say hello to someone sitting alone at a mountain viewpoint or train station. 🗺️✨ #TravelWisdom #Connection',
    image_url: null,
  },
  {
    user: 'nexus_demo_liam',
    content: 'Remember when computers felt like magic? Working with basic electronic breadboards brings that exact childlike curiosity back. Highly recommend building something tangible this weekend. #Makers #Electronics #Curiosity',
    image_url: null,
  },
];

const DEMO_COMMENTS = [
  { postIdx: 0, user: 'nexus_demo_david', content: 'Incredible work Alex! Did you benchmark memory consumption under load?' },
  { postIdx: 0, user: 'nexus_demo_alex', content: '@nexus_demo_david Stays rock solid under 85MB per worker node!' },
  { postIdx: 1, user: 'nexus_demo_chloe', content: 'That color contrast balance is gorgeous Elena. Clean and calming.' },
  { postIdx: 1, user: 'nexus_demo_marcus', content: 'Bookmarked for our hackathon project frontend. Super inspiring!' },
  { postIdx: 2, user: 'nexus_demo_alex', content: 'Good luck with the demo Marcus! Floor 4 library vibes bring back memories.' },
  { postIdx: 3, user: 'nexus_demo_maya', content: 'This lighting is ethereal Sophia! What focal length did you shoot this with?' },
  { postIdx: 3, user: 'nexus_demo_sophia', content: '@nexus_demo_maya 35mm f/1.8 on full frame. The morning haze helped a lot!' },
  { postIdx: 4, user: 'nexus_demo_elena', content: 'Love the geometric reflection lines. Incredible perspective David!' },
  { postIdx: 5, user: 'nexus_demo_sophia', content: 'Now that is proper latte art. Enjoy the creative session Chloe!' },
  { postIdx: 6, user: 'nexus_demo_marcus', content: 'Are you using LiDAR or ultrasound for the ranging Liam?' },
  { postIdx: 6, user: 'nexus_demo_liam', content: '@nexus_demo_marcus Time-of-flight LiDAR sensor on I2C bus!' },
  { postIdx: 7, user: 'nexus_demo_sophia', content: 'The green tones in PNW forests are unmatched. Gorgeous capture Maya!' },
  { postIdx: 8, user: 'nexus_demo_david', content: 'A tidy desk always speeds up deep work. Looks fantastic.' },
  { postIdx: 9, user: 'nexus_demo_alex', content: 'Huge congrats team! What was the prize category?' },
  { postIdx: 9, user: 'nexus_demo_marcus', content: '@nexus_demo_alex Best Technical Implementation & Community Impact!' },
  { postIdx: 10, user: 'nexus_demo_david', content: '100% agreed. Measure twice, cut once.' },
  { postIdx: 11, user: 'nexus_demo_alex', content: 'Negative code churn is the most satisfying PR review feeling.' },
  { postIdx: 12, user: 'nexus_demo_chloe', content: 'Love this mindset so much Maya. Beautiful reminder.' },
];

async function seed() {
  console.log('\n======================================================');
  console.log('  NEXUS SOCIAL PLATFORM — REALISTIC DEMO SEEDER');
  console.log('======================================================\n');

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean up legacy test artifact if present
    const testPostClean = await client.query(
      `DELETE FROM users WHERE username LIKE 'alice_%' OR username LIKE 'bob_%' OR username LIKE 'carol_%' OR username LIKE 'audit_%'`
    );
    if (testPostClean.rowCount > 0) {
      console.log(`✓ Cleaned up ${testPostClean.rowCount} transient test user artifact(s).`);
    }

    // 2. Insert or update Demo Users
    const userMap = {}; // username -> id
    const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 6);

    for (const u of DEMO_USERS) {
      const existing = await client.query('SELECT id, username FROM users WHERE username = $1', [u.username]);
      if (existing.rows.length > 0) {
        userMap[u.username] = existing.rows[0].id;
        await client.query(
          'UPDATE users SET display_name = $1, bio = $2 WHERE id = $3',
          [u.display_name, u.bio, existing.rows[0].id]
        );
        console.log(`  • User exists: @${u.username} (updated profile)`);
      } else {
        const created = await client.query(
          `INSERT INTO users (username, display_name, email, password_hash, bio)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [u.username, u.display_name, u.email, dummyPasswordHash, u.bio]
        );
        userMap[u.username] = created.rows[0].id;
        console.log(`  + Created user: @${u.username} (${u.display_name})`);
      }
    }

    // 3. Insert Demo Posts
    const createdPostIds = [];
    for (let i = 0; i < DEMO_POSTS.length; i++) {
      const p = DEMO_POSTS[i];
      const authorId = userMap[p.user];
      if (!authorId) continue;

      // Check if this post content already exists for this author
      const existing = await client.query(
        'SELECT id FROM posts WHERE author_id = $1 AND content = $2',
        [authorId, p.content]
      );

      if (existing.rows.length > 0) {
        createdPostIds[i] = existing.rows[0].id;
        // Ensure image_url is up to date
        await client.query('UPDATE posts SET image_url = $1 WHERE id = $2', [p.image_url, existing.rows[0].id]);
        console.log(`  • Post exists [${i + 1}/${DEMO_POSTS.length}]`);
      } else {
        const postRes = await client.query(
          `INSERT INTO posts (author_id, content, image_url, created_at)
           VALUES ($1, $2, $3, NOW() - ($4 || ' hours')::INTERVAL)
           RETURNING id`,
          [authorId, p.content, p.image_url, (DEMO_POSTS.length - i) * 3]
        );
        createdPostIds[i] = postRes.rows[0].id;
        console.log(`  + Created post [${i + 1}/${DEMO_POSTS.length}] by @${p.user} ${p.image_url ? '📷' : '📝'}`);
      }
    }

    // 4. Insert Demo Comments
    let addedComments = 0;
    for (const c of DEMO_COMMENTS) {
      const postId = createdPostIds[c.postIdx];
      const authorId = userMap[c.user];
      if (!postId || !authorId) continue;

      const existing = await client.query(
        'SELECT id FROM comments WHERE post_id = $1 AND author_id = $2 AND content = $3',
        [postId, authorId, c.content]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO comments (post_id, author_id, content, created_at)
           VALUES ($1, $2, $3, NOW() - ($4 || ' minutes')::INTERVAL)`,
          [postId, authorId, c.content, Math.floor(Math.random() * 120) + 10]
        );
        addedComments++;
      }
    }
    console.log(`✓ Processed ${DEMO_COMMENTS.length} comments (${addedComments} newly inserted).`);

    // 5. Insert Likes
    let addedLikes = 0;
    for (let pIdx = 0; pIdx < createdPostIds.length; pIdx++) {
      const postId = createdPostIds[pIdx];
      if (!postId) continue;

      // Select 3 to 6 demo users to like each post
      const likers = Object.values(userMap).sort(() => 0.5 - Math.random()).slice(0, (pIdx % 4) + 3);
      for (const uId of likers) {
        const res = await client.query(
          `INSERT INTO likes (post_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (post_id, user_id) DO NOTHING`,
          [postId, uId]
        );
        if (res.rowCount > 0) addedLikes++;
      }
    }
    console.log(`✓ Distributed social likes (${addedLikes} newly inserted).`);

    // 6. Insert Follow Relationships
    let addedFollows = 0;
    const allUserIds = Object.values(userMap);
    for (const u1 of allUserIds) {
      // Follow 2 to 4 other demo users
      const targets = allUserIds.filter(u2 => u2 !== u1).sort(() => 0.5 - Math.random()).slice(0, 3);
      for (const u2 of targets) {
        const res = await client.query(
          `INSERT INTO follows (follower_id, following_id)
           VALUES ($1, $2)
           ON CONFLICT (follower_id, following_id) DO NOTHING`,
          [u1, u2]
        );
        if (res.rowCount > 0) addedFollows++;
      }
    }
    console.log(`✓ Established community follow relationships (${addedFollows} newly inserted).`);

    await client.query('COMMIT');
    console.log('\n======================================================');
    console.log('  DEMO SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error (transaction rolled back):', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
