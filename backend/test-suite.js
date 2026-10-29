require("dotenv").config();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000/api";

function generateTestToken(userId, email) {
  return jwt.sign(
    { sub: userId, email: email, purpose: "session" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function runTests() {
  console.log("==========================================");
  console.log("   BORROWBUDDY COMPREHENSIVE TEST SUITE   ");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${API_BASE}/health`).then((r) => r.json());
    assert(healthRes.success === true, "Health check endpoint returns success");

    // 2. Unauthenticated check on protected endpoint
    const unauthMe = await fetch(`${API_BASE}/auth/me`);
    assert(unauthMe.status === 401, "Unauthenticated /api/auth/me returns 401");

    // 3. Admin & Student tokens
    const adminToken = generateTestToken(3, "sm4721@srmist.edu.in");
    const studentToken = generateTestToken(2, "si0221@srmist.edu.in");

    // 4. Session restoration /me
    const adminMe = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then((r) => r.json());
    assert(adminMe.success === true && adminMe.user.role === "admin", "Admin user (SM 471) verified with role 'admin'");

    const studentMe = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    }).then((r) => r.json());
    assert(studentMe.success === true && studentMe.user.role === "student", "Student user verified with role 'student'");

    // 5. Admin security: ordinary student cannot access admin routes
    const studentAdminCheck = await fetch(`${API_BASE}/admin/listings/pending`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentAdminCheck.status === 403, "Student is denied access (403) to /api/admin/listings/pending");

    // 6. Authorized admin can access admin routes
    const adminAccessCheck = await fetch(`${API_BASE}/admin/listings/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminAccessCheck.status === 200, "Authorized admin (SM 471) accesses /api/admin/listings/pending (200)");

    // 7. Create a listing with real image file
    // Create a temporary 1x1 png image file
    const sampleImgPath = path.join(__dirname, "test-sample.png");
    const samplePngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    fs.writeFileSync(sampleImgPath, samplePngBuffer);

    const formData = new FormData();
    formData.append("title", "Texas Instruments TI-84 Plus Calculator");
    formData.append("category", "Calculators");
    formData.append("description", "Fully functional graphing calculator for Calculus & Engineering Math.");
    formData.append("itemCondition", "like_new");
    formData.append("rentalPricePerDay", "40");
    formData.append("depositAmount", "150");
    formData.append("pickupLocation", "SRM Tech Park 3rd Floor");
    formData.append("rules", "Please do not drop; return with cover.");

    const blob = new Blob([samplePngBuffer], { type: "image/png" });
    formData.append("images", blob, "calculator.png");

    const createListingRes = await fetch(`${API_BASE}/listings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formData
    }).then((r) => r.json());

    assert(createListingRes.success === true && createListingRes.listingId > 0, "Student creates listing with real image upload (starts as pending)");
    const createdListingId = createListingRes.listingId;

    // 8. Verify listing does NOT appear in public marketplace while pending
    const publicListingsBefore = await fetch(`${API_BASE}/listings`).then((r) => r.json());
    const isVisibleBefore = publicListingsBefore.listings.some((l) => l.id === createdListingId);
    assert(!isVisibleBefore, "Pending listing is NOT visible in public Borrow marketplace");

    // 9. Admin reviews and approves listing
    const approveRes = await fetch(`${API_BASE}/admin/listings/${createdListingId}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then((r) => r.json());
    assert(approveRes.success === true, "Admin (SM 471) successfully approves pending listing");

    // 10. Verify approved listing appears in public marketplace
    const publicListingsAfter = await fetch(`${API_BASE}/listings`).then((r) => r.json());
    const approvedItem = publicListingsAfter.listings.find((l) => l.id === createdListingId);
    assert(approvedItem !== undefined && approvedItem.status === "approved", "Approved listing appears in public Borrow marketplace");
    assert(approvedItem && approvedItem.images.length > 0, "Uploaded photo URL is linked to listing in MySQL");

    // 11. Request to borrow (Admin borrows from Student)
    const today = new Date();
    const startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const bookRes = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        listingId: createdListingId,
        startDate: startDate,
        endDate: endDate,
        borrowerNotes: "Need this for my semester exam on Wednesday."
      })
    }).then((r) => r.json());

    assert(bookRes.success === true && bookRes.bookingId > 0, "Borrower submits booking request for specific dates (status: pending)");
    const bookingId = bookRes.bookingId;

    // 12. Owner accepts the booking request
    const acceptRes = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        newStatus: "accepted",
        responseNotes: "Sure! Let's meet at Tech Park at 9 AM."
      })
    }).then((r) => r.json());

    assert(acceptRes.success === true && acceptRes.status === "accepted", "Owner accepts booking request");
    assert(acceptRes.conversationId > 0, "Private chat conversation is automatically created between borrower and owner");
    const conversationId = acceptRes.conversationId;

    // 13. Double booking prevention: try to book overlapping dates
    const conflictBookRes = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        listingId: createdListingId,
        startDate: startDate,
        endDate: endDate
      })
    });
    assert(conflictBookRes.status === 409, "Double booking prevention: overlapping confirmed booking request is rejected with 409 Conflict");

    // 14. Messaging: send and receive chat messages
    const sendMsgRes = await fetch(`${API_BASE}/chats/${conversationId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messageText: "Thanks! I will see you near the lift at 9 AM."
      })
    }).then((r) => r.json());
    assert(sendMsgRes.success === true && sendMsgRes.message.id > 0, "Borrower sends message in private conversation");

    const getMessagesRes = await fetch(`${API_BASE}/chats/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    }).then((r) => r.json());
    assert(getMessagesRes.success === true && getMessagesRes.messages.length >= 2, "Owner retrieves messages in chronological order");

    // 15. Help a Buddy: Create help request & offer workflow
    const helpReqRes = await fetch(`${API_BASE}/help`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "IEEE Format Alignment for Compiler Design Report",
        category: "Docs and Formatting",
        description: "Need help properly aligning tables, margins, and citations for our department paper.",
        budget: 100
      })
    }).then((r) => r.json());
    assert(helpReqRes.success === true && helpReqRes.requestId > 0, "Student creates academic help request in Help a Buddy");
    const helpRequestId = helpReqRes.requestId;

    const offerRes = await fetch(`${API_BASE}/help/${helpRequestId}/offers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "I am familiar with IEEE LaTeX templates and can format this for you.",
        priceQuote: 80
      })
    }).then((r) => r.json());
    assert(offerRes.success === true && offerRes.offerId > 0, "Helper submits an offer with quote");

    // Requester accepts offer
    const acceptOfferRes = await fetch(`${API_BASE}/help/offers/${offerRes.offerId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ newStatus: "accepted" })
    }).then((r) => r.json());
    assert(acceptOfferRes.success === true && acceptOfferRes.conversationId > 0, "Requester accepts offer and private help chat is established");

    // 16. Return / Completion workflow
    const returnRes = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ newStatus: "completed" })
    }).then((r) => r.json());
    assert(returnRes.success === true && returnRes.status === "completed", "Item marked as returned/completed, releasing reservation");

    // Clean up sample image
    if (fs.existsSync(sampleImgPath)) fs.unlinkSync(sampleImgPath);

  } catch (error) {
    console.error("Test execution exception:", error);
    failed++;
  }

  console.log("\n==========================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==========================================");

  if (failed > 0) process.exit(1);
}

runTests();
