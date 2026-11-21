// ============================================================
//  Express reverse proxy — Railway / Deplexo compatible
//  Ported from Cloudflare Worker (same behavior)
//  Ads removed.
// ============================================================

const express = require("express");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 3000;

const shopifyDomain = "amazonjobs4u.jobtalika.com";

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── MAIN PROXY HANDLER ─────────────────────────────────────────────────────
app.use(async (req, res) => {
  const proxyHost = req.hostname;
  const incomingPath = req.originalUrl;

  if (req.path.includes("/pages/url-submission-page")) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Page Not Found</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #667eea;">404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <a href="/" style="color: #667eea; text-decoration: none; font-weight: bold;">Go to Homepage</a>
      </body>
      </html>`);
  }

  const targetURL = `https://${shopifyDomain}${incomingPath}`;

  try {
    let bodyBuffer = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      bodyBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    }

    const buildHeaders = (hostname) => {
      const headers = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (["host", "cf-connecting-ip", "cf-ray", "connection"].includes(k)) continue;
        headers[k] = Array.isArray(v) ? v.join(", ") : v;
      }
      headers["host"] = hostname;
      headers["X-Forwarded-Host"] = proxyHost;
      headers["X-Forwarded-Proto"] = "https";
      return headers;
    };

    let fetchURL = targetURL;
    let upstream;
    let redirectCount = 0;

    while (redirectCount < 5) {
      const currentHost = new URL(fetchURL).hostname;
      upstream = await fetch(fetchURL, {
        method: req.method,
        headers: buildHeaders(currentHost),
        body: bodyBuffer || undefined,
        redirect: "manual",
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        let location = upstream.headers.get("location") || "";
        if (location.includes(shopifyDomain)) {
          location = location
            .replace(`https://${shopifyDomain}`, `https://${proxyHost}`)
            .replace(`http://${shopifyDomain}`, `https://${proxyHost}`);
          return res.status(upstream.status).set("location", location).send();
        }
        if (location.includes(proxyHost)) {
          return res.status(upstream.status).set("location", location).send();
        }
        fetchURL = location.startsWith("http") ? location : `https://${shopifyDomain}${location}`;
        redirectCount++;
        continue;
      }
      break;
    }

    const skipHeaders = ["content-encoding", "transfer-encoding", "content-length", "connection"];
    upstream.headers.forEach((value, key) => {
      if (skipHeaders.includes(key.toLowerCase())) return;
      if (key.toLowerCase() === "set-cookie") {
        value = value.replace(/Domain=[^;]+;?/gi, "");
      }
      res.set(key, value);
    });

    const contentType = upstream.headers.get("content-type") || "";

    const rewriteText = (body) =>
      body
        .split(`https://${shopifyDomain}`).join(`https://${proxyHost}`)
        .split(`http://${shopifyDomain}`).join(`https://${proxyHost}`)
        .split("JobChayan").join("JobFounder")
        .split("jobchayan").join("jobfounder");

    const rewriteSitemapUrls = (body) => {
      const sitemapDomains = [
        shopifyDomain,
        "onyxremotejobs.com",
        "entryleveljobs.onlinejob247.com",
        "ihire.allboardsolutions.in",
      ];
      let result = body;
      sitemapDomains.forEach((domain) => {
        const escaped = domain.replace(/\./g, "\\.");
        const regex = new RegExp(`(https?:\\/\\/)${escaped}([^<\\s]*)`, "g");
        result = result.replace(regex, `https://${proxyHost}$2`);
      });
      return result;
    };

    if (contentType.includes("text/html")) {
      let body = rewriteText(await upstream.text());

      body = body.replace(/Common Interview Questions And Answers/gi, "");
      body = body.replace(/<h[1-6][^>]*>[\s]*Common Interview Questions And Answers[\s]*<\/h[1-6]>/gi, "");
      body = body.replace(/<div[^>]*class="[^"]*"[^>]*>[\s\S]*?Common Interview Questions And Answers[\s\S]*?<\/div>/gi, "");

      body = body.replace(/Ads/gi, "");
      body = body.replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
      body = body.replace(/<span[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");

      body = body.replace(/Close share/gi, "");
      body = body.replace(/Copy link/gi, "");
      body = body.replace(/Back to blog/gi, "");
      body = body.replace(/Get Hired Faster With Roku!/gi, "");

      body = body.replace(/<[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*twitter[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*facebook[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*linkedin[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*pinterest[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*whatsapp[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*class="[^"]*telegram[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");
      body = body.replace(/<[^>]*id="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi, "");

      body = body.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
        if (/share|twitter|facebook|linkedin|social|icon/.test(match)) return "";
        return match;
      });

      body = body.replace(/<img[^>]*src="[^"]*Apply_Now_Button[^"]*"[^>]*>/gi, "");
      body = body.replace(/Apply_Now_Button_Dps_430x\.png/g, "");

      body = body.replace(
        /https:\/\/ihire\.allboardsolutions\.in\/job\/[^\s"')]+/g,
        "https://ouchi.wowseries.lovestoblog.com/apply-now"
      );

      const extractContent = () => {
        const titleMatch = body.match(/<title>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : "Job Portal";
        let mainContent = "";
        const mainMatch = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        if (mainMatch) mainContent = mainMatch[1];
        else {
          const c = body.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (c) mainContent = c[1];
        }
        let jobListings = "";
        const jobMatch = body.match(/<div[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
        if (jobMatch) jobListings = jobMatch.join("");
        let blogPosts = "";
        const blogMatch = body.match(/<article[^>]*>([\s\S]*?)<\/article>/gi);
        if (blogMatch) blogPosts = blogMatch.join("");
        return { title, mainContent, jobListings, blogPosts };
      };

      const content = extractContent();

      if (req.path === "/" || req.path === "") {
        body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - Find Your Dream Career with JobFounder</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f0f4f8;color:#1a202c;line-height:1.6}
.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:20px 0;position:sticky;top:0;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,.2)}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
.header-content{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
.logo{font-size:28px;font-weight:800;letter-spacing:-1px}
.logo span{color:#fbbf24}
.nav-links{display:flex;gap:30px;align-items:center}
.nav-links a{color:#fff;text-decoration:none;font-weight:500}
.nav-links a:hover{opacity:.8}
.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:80px 0;text-align:center;border-radius:0 0 50px 50px;margin-bottom:40px}
.hero h1{font-size:48px;margin-bottom:20px;font-weight:800}
.hero p{font-size:20px;max-width:600px;margin:0 auto 30px;opacity:.95}
.search-box{display:flex;max-width:600px;margin:0 auto;background:#fff;border-radius:50px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.2)}
.search-box input{flex:1;padding:18px 25px;border:none;outline:none;font-size:16px}
.search-box button{padding:18px 35px;background:#fbbf24;border:none;font-weight:700;color:#1a202c;cursor:pointer}
.featured-section{background:#fff;border-radius:20px;padding:40px;margin-bottom:40px;box-shadow:0 2px 10px rgba(0,0,0,.08)}
.section-title{font-size:28px;font-weight:700;margin-bottom:30px;color:#1a202c}
.section-title span{color:#667eea}
.job-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:25px;margin-top:20px}
.job-card{background:#f7fafc;border-radius:15px;padding:25px;border-left:4px solid #667eea}
.job-card h3{font-size:18px;margin-bottom:10px;color:#2d3748}
.job-card .company{color:#718096;font-weight:500}
.job-card .location{color:#a0aec0;font-size:14px;margin:10px 0}
.job-card .tag{display:inline-block;padding:4px 12px;background:#e2e8f0;border-radius:20px;font-size:12px;color:#4a5568}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:25px}
.blog-card{background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
.blog-card .content{padding:20px}
.blog-card h4{font-size:18px;margin-bottom:10px;color:#2d3748}
.blog-card p{color:#718096;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:40px 0}
.stat-card{background:#fff;border-radius:15px;padding:30px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.08)}
.stat-card .number{font-size:36px;font-weight:800;color:#667eea}
.stat-card .label{color:#718096;margin-top:5px}
.apply-now-container{text-align:center;margin:40px 0;padding:30px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:15px;color:#fff}
.apply-now-container h2{font-size:28px;margin-bottom:15px}
.apply-now-btn{display:inline-block;padding:18px 50px;background:#fbbf24;color:#1a202c;text-decoration:none;border-radius:50px;font-weight:700;font-size:18px;box-shadow:0 4px 15px rgba(0,0,0,.2)}
.apply-now-btn:hover{transform:scale(1.05)}
.footer{background:#1a202c;color:#fff;padding:40px 0;margin-top:40px;border-radius:50px 50px 0 0}
.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:30px}
.footer h4{margin-bottom:15px;color:#fbbf24}
.footer a{color:#a0aec0;text-decoration:none;display:block;margin-bottom:8px}
.footer a:hover{color:#fff}
.footer-bottom{text-align:center;padding-top:30px;margin-top:30px;border-top:1px solid #2d3748;color:#718096}
@media(max-width:768px){.hero h1{font-size:32px}.nav-links{gap:15px}.search-box{flex-direction:column;border-radius:20px}}
</style>
<meta name="google-site-verification" content="d-tVFEGSIg6li7C2_8MwQI6owZxohaV-rp8-FS0edAM" />
</head>
<body>
<header class="header"><div class="container header-content"><div class="logo">Job<span>Founder</span></div>
<nav class="nav-links"><a href="/">Home</a><a href="/pages/jobs">Jobs</a><a href="/blogs">Blog</a><a href="/pages/about">About</a><a href="/pages/contact">Contact</a></nav></div></header>
<section class="hero"><div class="container"><h1>Your Dream Career Starts Here</h1><p>Discover thousands of opportunities from top companies. Find the perfect job that matches your skills and passion.</p>
<div class="search-box"><input type="text" placeholder="Search jobs, companies, or keywords..."><button>Search Jobs</button></div></div></section>
<div class="container">
<div class="apply-now-container"><h2>Ready to Take the Next Step?</h2><p style="margin-bottom:20px;font-size:18px;">Apply now and start your journey towards a brighter future</p>
<a href="https://ouchi.wowseries.lovestoblog.com/apply-now" class="apply-now-btn" target="_blank">Apply Now →</a></div>
<div class="stats"><div class="stat-card"><div class="number">10K+</div><div class="label">Active Jobs</div></div>
<div class="stat-card"><div class="number">5K+</div><div class="label">Companies</div></div>
<div class="stat-card"><div class="number">50K+</div><div class="label">Happy Candidates</div></div></div>
<div class="featured-section"><h2 class="section-title">Featured <span>Jobs</span></h2><div class="job-grid">
${content.jobListings || `<div class="job-card"><h3>Software Engineer</h3><div class="company">Tech Corp Inc.</div><div class="location">San Francisco, CA</div><span class="tag">Full-time</span></div>
<div class="job-card"><h3>Product Manager</h3><div class="company">Innovation Labs</div><div class="location">New York, NY</div><span class="tag">Remote</span></div>
<div class="job-card"><h3>Data Scientist</h3><div class="company">AI Solutions</div><div class="location">Austin, TX</div><span class="tag">Full-time</span></div>`}
</div></div>
<div class="featured-section"><h2 class="section-title">Latest <span>Insights</span></h2><div class="blog-grid">
${content.blogPosts || `<div class="blog-card"><div class="content"><h4>How to Ace Your Next Interview</h4><p>Tips and strategies to impress employers and land your dream job.</p></div></div>
<div class="blog-card"><div class="content"><h4>Top Skills for 2026</h4><p>Discover the most in-demand skills that employers are looking for.</p></div></div>
<div class="blog-card"><div class="content"><h4>Remote Work Trends</h4><p>How the workplace is evolving and what it means for job seekers.</p></div></div>`}
</div></div>
</div>
<footer class="footer"><div class="container"><div class="footer-grid">
<div><h4>JobFounder</h4><p style="color:#a0aec0;">Your trusted partner in finding the perfect career opportunity.</p></div>
<div><h4>Quick Links</h4><a href="/pages/jobs">Browse Jobs</a><a href="/pages/companies">Companies</a><a href="/blogs">Blog</a></div>
<div><h4>Support</h4><a href="/pages/contact">Contact Us</a><a href="/pages/faq">FAQ</a><a href="/pages/privacy-policy">Privacy Policy</a></div>
</div><div class="footer-bottom">&copy; 2026 JobFounder. All rights reserved.</div></div></footer>
</body></html>`;
      } else {
        const pageTitle = content.title || "Job Details";
        body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} | JobFounder</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f0f4f8;color:#1a202c;line-height:1.6}
.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:15px 0;position:sticky;top:0;z-index:1000}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
.header-content{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
.logo{font-size:24px;font-weight:800}
.logo span{color:#fbbf24}
.nav-links{display:flex;gap:25px}
.nav-links a{color:#fff;text-decoration:none;font-weight:500}
.breadcrumb{background:#fff;padding:15px 0;box-shadow:0 2px 4px rgba(0,0,0,.05);margin-bottom:30px}
.breadcrumb a{color:#667eea;text-decoration:none}
.content-wrapper{background:#fff;border-radius:20px;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,.08);margin-bottom:30px;max-width:900px;margin-left:auto;margin-right:auto}
.content-wrapper h1{font-size:32px;margin-bottom:20px}
.content-wrapper h2{font-size:24px;margin-top:30px;margin-bottom:15px}
.content-wrapper p{color:#4a5568;margin-bottom:15px}
.content-wrapper img{max-width:100%;border-radius:10px;margin:20px 0}
.apply-now-btn-inner{display:inline-block;padding:15px 45px;background:#fbbf24;color:#1a202c;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,.1)}
.footer{background:#1a202c;color:#fff;padding:30px 0;margin-top:40px}
.footer-content{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px}
.footer a{color:#a0aec0;text-decoration:none;margin:0 10px}
.footer-bottom{text-align:center;padding-top:20px;margin-top:20px;border-top:1px solid #2d3748;color:#718096}
@media(max-width:768px){.content-wrapper{padding:20px}.content-wrapper h1{font-size:24px}}
</style>
</head>
<body>
<header class="header"><div class="container header-content"><div class="logo">Job<span>Founder</span></div>
<nav class="nav-links"><a href="/">Home</a><a href="/pages/jobs">Jobs</a><a href="/blogs">Blog</a></nav></div></header>
<div class="breadcrumb"><div class="container"><a href="/">Home</a> / <span>${pageTitle}</span></div></div>
<div class="container"><div class="content-wrapper">
${content.mainContent || "<p>Content not available</p>"}
<div style="text-align:center;margin-top:30px;padding-top:30px;border-top:2px solid #e2e8f0;">
<a href="https://ouchi.wowseries.lovestoblog.com/apply-now" class="apply-now-btn-inner" target="_blank">Apply Now →</a>
</div></div></div>
<footer class="footer"><div class="container"><div class="footer-content">
<div>&copy; 2026 JobFounder. All rights reserved.</div>
<div><a href="/pages/privacy-policy">Privacy</a><a href="/pages/terms">Terms</a><a href="/pages/contact">Contact</a></div>
</div><div class="footer-bottom">Helping you find your dream career</div></div></footer>
</body></html>`;
      }

      body = body.replace(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
        (match, json) => {
          try {
            const schema = JSON.parse(json);
            const update = (obj) => {
              if (!obj || typeof obj !== "object") return obj;
              if (Array.isArray(obj)) return obj.map(update);
              if (obj["@type"] === "JobPosting") {
                obj["datePosted"] = "2026-05-06";
                obj["validThrough"] = "2026-12-31";
              }
              Object.keys(obj).forEach((k) => { obj[k] = update(obj[k]); });
              return obj;
            };
            return `<script type="application/ld+json">${JSON.stringify(update(schema))}</script>`;
          } catch {
            return match;
          }
        }
      );

      res.set("content-type", "text/html; charset=utf-8");
      return res.status(upstream.status).send(body);
    }

    if (contentType.includes("text/css")) {
      let body = rewriteText(await upstream.text());
      body = body.replace(/\.google-ad[\s\S]*?\{[\s\S]*?\}/g, "");
      body = body.replace(/\.ads[\s\S]*?\{[\s\S]*?\}/g, "");
      body = body.replace(/\.ad-container[\s\S]*?\{[\s\S]*?\}/g, "");
      body = body.replace(/\.share[\s\S]*?\{[\s\S]*?\}/g, "");
      body = body.replace(/\.social[\s\S]*?\{[\s\S]*?\}/g, "");
      res.set("content-type", "text/css");
      return res.status(upstream.status).send(body);
    }

    if (req.path.includes("sitemap") || contentType.includes("xml")) {
      let body = await upstream.text();
      body = rewriteText(body);
      body = rewriteSitemapUrls(body);
      res.set("content-type", "application/xml; charset=utf-8");
      return res.status(upstream.status).send(body);
    }

    if (contentType.includes("javascript")) {
      let body = rewriteText(await upstream.text());
      body = body.replace(/ca-pub-9245004010937297/g, "");
      body = body.replace(/google_ad_client/g, "blocked_ad_client");
      body = body.replace(/adsbygoogle/g, "blocked_ads");
      body = body.replace(/pagead2\.googlesyndication\.com/g, "blocked.ad.domain");
      body = body.replace(/share/g, "blocked_share");
      body = body.replace(/social/g, "blocked_social");
      res.set("content-type", contentType);
      return res.status(upstream.status).send(body);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(buffer);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).send("Proxy error: " + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy running on http://localhost:${PORT}`);
  console.log(`   Upstream: https://${shopifyDomain}`);
});
