const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const userModel = require('../models/userModel');

// ─── Allowed College Domains ─────────────────────────────────────────────────
const ALLOWED_DOMAINS = new Set([
  // ── Your primary college ──
  'jklu.edu.in',

  // ── IITs ──
  'iitb.ac.in',       // IIT Bombay
  'iitd.ac.in',       // IIT Delhi
  'iitm.ac.in',       // IIT Madras
  'iitk.ac.in',       // IIT Kanpur
  'iitkgp.ac.in',     // IIT Kharagpur
  'iitg.ac.in',       // IIT Guwahati
  'iith.ac.in',       // IIT Hyderabad
  'iitbbs.ac.in',     // IIT Bhubaneswar
  'iitr.ac.in',       // IIT Roorkee
  'iitgn.ac.in',      // IIT Gandhinagar
  'iitj.ac.in',       // IIT Jodhpur
  'iitp.ac.in',       // IIT Patna
  'iitrpr.ac.in',     // IIT Ropar
  'iitmandi.ac.in',   // IIT Mandi
  'iitpkd.ac.in',     // IIT Palakkad
  'iittirupati.ac.in',// IIT Tirupati
  'iitism.ac.in',     // IIT(ISM) Dhanbad
  'iitdh.ac.in',      // IIT Dharwad
  'iitbhilai.ac.in',  // IIT Bhilai
  'iitjammu.ac.in',   // IIT Jammu

  // ── NITs ──
  'mnit.ac.in',       // MNIT Jaipur
  'nitk.ac.in',       // NIT Karnataka
  'vnit.ac.in',       // VNIT Nagpur
  'nit.ac.in',        // NIT Trichy
  'nitw.ac.in',       // NIT Warangal
  'nitp.ac.in',       // NIT Patna
  'nitrkl.ac.in',     // NIT Rourkela
  'mnnit.ac.in',      // MNNIT Allahabad
  'nits.ac.in',       // NIT Silchar
  'nitsri.ac.in',     // NIT Srinagar
  'nitj.ac.in',       // NIT Jalandhar
  'nitdgp.ac.in',     // NIT Durgapur
  'nitkl.ac.in',      // NIT Calicut
  'nitm.ac.in',       // NIT Manipur
  'nitmz.ac.in',      // NIT Mizoram
  'nitnagaland.ac.in',// NIT Nagaland
  'nitpuducherry.ac.in',
  'nitsikkim.ac.in',
  'nituk.ac.in',      // NIT Uttarakhand
  'nitagartala.ac.in',// NIT Agartala
  'nitmeghalaya.ac.in',
  'nitgoa.ac.in',
  'nita.ac.in',       // NIT Arunachal Pradesh
  'nitraipur.ac.in',  // NIT Raipur
  'nitdelhi.ac.in',   // NIT Delhi
  'nitandhra.ac.in',  // NIT Andhra Pradesh

  // ── IIITs ──
  'iiit.ac.in',       // IIIT Hyderabad
  'iiitd.ac.in',      // IIIT Delhi
  'iiita.ac.in',      // IIIT Allahabad
  'iiitb.ac.in',      // IIIT Bangalore
  'iiitdmkurnool.ac.in',
  'iiitdm.ac.in',     // IIITDM Chennai
  'iiitdmj.ac.in',    // IIITDM Jabalpur
  'iiitg.ac.in',      // IIIT Guwahati
  'iiitkota.ac.in',   // IIIT Kota
  'iiitl.ac.in',      // IIIT Lucknow
  'iiitm.ac.in',      // IIITM Gwalior
  'iiitmanipurl.ac.in',
  'iiitnagpur.ac.in',
  'iiitp.ac.in',      // IIIT Pune
  'iiitranchi.ac.in',
  'iiits.ac.in',      // IIIT Sri City
  'iiitsonepat.ac.in',
  'iiitr.ac.in',      // IIIT Raichur
  'iiituna.ac.in',    // IIIT Una
  'iiitvadodara.ac.in',
  'iiitv.ac.in',

  // ── Central Universities / Premier Institutions ──
  'du.ac.in',         // Delhi University
  'jnu.ac.in',        // JNU
  'bhu.ac.in',        // BHU Varanasi
  'hcu.ac.in',        // Hyderabad Central University
  'manipal.edu',      // Manipal University
  'bits-pilani.ac.in',// BITS Pilani
  'pilani.bits-pilani.ac.in',
  'goa.bits-pilani.ac.in',
  'hyderabad.bits-pilani.ac.in',
  'dubai.bits-pilani.ac.in',
  'thapar.edu',       // Thapar University
  'vit.ac.in',        // VIT Vellore
  'vitap.ac.in',      // VIT-AP
  'vitbhopal.ac.in',  // VIT Bhopal
  'amity.edu',        // Amity University
  'christuniversity.in',
  'christcollege.edu',
  'srm.edu.in',       // SRM University
  'srmist.edu.in',
  'psgtech.ac.in',    // PSG Tech
  'cbit.ac.in',       // CBIT Hyderabad
  'rvce.edu.in',      // RVCE Bangalore
  'bmsce.ac.in',      // BMS College of Engineering
  'msrit.edu',        // MSRIT Bangalore
  'nitte.edu.in',     // NITTE University
  'lnmiit.ac.in',     // LNMIIT Jaipur
  'poornima.edu.in',  // Poornima University
  'curaj.ac.in',      // Central University of Rajasthan

  // ── IISc / IISERs ──
  'iisc.ac.in',
  'iiserpune.ac.in',
  'iiserkol.ac.in',
  'iisermohali.ac.in',
  'iiserbhopal.ac.in',
  'iisertvm.ac.in',
  'iiserberhampur.ac.in',
  'iisertirupati.ac.in',

  // ── IIMs (for good measure) ──
  'iima.ac.in',
  'iimb.ac.in',
  'iimc.ac.in',
  'iimcal.ac.in',
  'iimk.ac.in',
  'iiml.ac.in',
  'iimu.ac.in',
  'iimi.ac.in',
  'iimraipur.ac.in',
  'iimranchi.ac.in',
  'iimtrichy.ac.in',
  'iimudaipur.ac.in',
  'iimvisakhapatnam.ac.in',
  'iimkashipur.ac.in',
  'iimnagpur.ac.in',
  'iimsirmaur.ac.in',
  'iimsambalpur.ac.in',
  'iimjammu.ac.in',
  'iimbodhgaya.ac.in',
]);

// ─── OTP Store (in-memory, replace with Redis in production) ─────────────────
// Shape: { email: { otp, expiresAt, formData } }
const otpStore = new Map();

// ─── Nodemailer transporter ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail address
    pass: process.env.EMAIL_PASS,   // Gmail App Password (not your login password)
  },
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getDomainFromEmail(email) {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: `"Lenden" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Lenden verification code',
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1A1A1A;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display:inline-block; background:#1A1A1A; color:#FAFAF7; width:48px; height:48px; border-radius:14px; font-size:24px; line-height:48px; text-align:center;">↕</div>
          <h2 style="margin:12px 0 4px; font-size:28px; letter-spacing:-1px;">lenden</h2>
          <p style="color:#888880; font-size:13px; margin:0;">campus lending, simplified</p>
        </div>
        <p style="font-size:16px; margin-bottom:8px;">Hi there,</p>
        <p style="font-size:15px; color:#444; line-height:1.6; margin-bottom:32px;">
          Here is your one-time verification code. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align:center; background:#F4F4F0; border-radius:14px; padding:28px; margin-bottom:32px;">
          <span style="font-size:40px; font-weight:700; letter-spacing:12px; color:#1A1A1A;">${otp}</span>
        </div>
        <p style="font-size:13px; color:#AAAAAA; text-align:center;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── Controller ──────────────────────────────────────────────────────────────
class AuthController {

  /**
   * POST /api/auth/send-otp
   * Validates email domain, then sends OTP. Does NOT create the user yet.
   */
  async sendOtp(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const domain = getDomainFromEmail(email);
      if (!ALLOWED_DOMAINS.has(domain)) {
        return res.status(403).json({
          success: false,
          message: `Email domain @${domain} is not allowed. Please use your official college email.`,
        });
      }

      const existing = await userModel.findByEmail(email);
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }

      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(email, { otp, expiresAt });

      await sendOtpEmail(email, otp);

      return res.status(200).json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
      console.error('Send OTP error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verifies OTP, then creates the user account.
   */
  async verifyOtpAndSignup(req, res) {
    try {
      const { username, email, password, otp } = req.body;

      if (!username || !email || !password || !otp) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      const record = otpStore.get(email);
      if (!record) {
        return res.status(400).json({ success: false, message: 'No OTP found for this email. Please request a new one.' });
      }
      if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      }
      if (record.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
      }

      // OTP valid — clean up
      otpStore.delete(email);

      // Double-check no one else registered in the meantime
      const existing = await userModel.findByEmail(email);
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }

      const domain = getDomainFromEmail(email);
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await userModel.createUser({
        username,
        email,
        password: hashedPassword,
        org: domain,
        emailVerified: true,
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
      });

    } catch (error) {
      console.error('Verify OTP error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
      }

      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.username, org: user.org },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: { id: user._id, username: user.username, email: user.email, org: user.org },
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();