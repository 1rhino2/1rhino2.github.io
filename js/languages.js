// Language skills data and rendering
const langs = [
    {
        name: "R",
        icon: "📊",
        status: "Proficient",
        class: "know",
        strengths: [
            "Build comprehensive statistical analysis pipelines.",
            "Create publication-quality visualizations with ggplot2.",
            "Perform data wrangling and transformation with tidyverse.",
            "Implement statistical modeling and hypothesis testing."
        ],
        pros: [
            "Design automated reporting systems with R Markdown.",
            "Build interactive dashboards with Shiny.",
            "Perform exploratory data analysis efficiently.",
            "Integrate with databases for large-scale data processing."
        ],
        cons: [
            "Performance limited for very large datasets without optimization.",
            "Package dependencies can be complex.",
            "GUI development outside Shiny is limited."
        ],
        make: [
            "Statistical analysis reports with automated generation",
            "Interactive Shiny dashboards for data exploration",
            "Publication-ready data visualizations",
            "ETL pipelines for data cleaning and transformation",
            "Predictive modeling and forecasting tools",
            "Automated PDF/HTML report generation"
        ],
        future: [
            "Shiny dashboard for real-time analytics",
            "Automated reporting framework with scheduled generation",
            "Statistical package for specialized analysis"
        ],
        projects: [
            "In development: R graphing utility library",
            "In development: Data pipeline automation tool"
        ]
    },
    {
        name: "Java",
        icon: "☕",
        status: "Learning",
        class: "learn",
        strengths: [
            "Learning object-oriented patterns and Java libraries.",
            "Can write basic CLI and GUI apps.",
            "Comfortable with basic JDBC, Swing, and simple multithreading."
        ],
        pros: [
            "Understand core Java syntax.",
            "Can debug simple Java programs.",
            "Learning to build more robust desktop tools."
        ],
        cons: [
            "Still learning complex frameworks.",
            "Prefer scripting for rapid tasks.",
            "GUI design is basic."
        ],
        make: [
            "Simple CLI utilities",
            "Basic desktop apps"
        ],
        future: [
            "Java-powered dashboard",
            "Multi-threaded tool"
        ],
        projects: [
            "Will be released soon: Java CLI app"
        ]
    },
    {
        name: "x64 Assembly",
        icon: "🧵",
        status: "Decent",
        class: "know",
        strengths: [
            "Can reverse engineer and debug binary instructions.",
            "Write simple assembly utilities for educational demos.",
            "Decent at analyzing malware samples and shellcode."
        ],
        pros: [
            "Good for binary analysis.",
            "Fun for reverse engineering puzzles.",
            "Can optimize for tiny utilities."
        ],
        cons: [
            "Advanced assembly projects take longer.",
            "Debugging is slow.",
            "Documentation is sparse."
        ],
        make: [
            "Tiny utilities",
            "RE and malware demo tools"
        ],
        future: [
            "Assembly-based puzzle generator"
        ],
        projects: [
            "Will be released soon: Assembly malware analysis demo"
        ]
    },
    {
        name: "Nim",
        icon: "⚡",
        status: "Learning",
        class: "learn",
        strengths: [
            "Learning fast scripting and native code generation.",
            "Playing with Nim for web and CLI utilities."
        ],
        pros: [
            "Easy syntax for quick utilities.",
            "Compiles to native binaries."
        ],
        cons: [
            "Still learning the ecosystem.",
            "Limited package experience."
        ],
        make: [
            "Small CLI tools",
            "Web API demos"
        ],
        future: [
            "Nim-based dashboard"
        ],
        projects: [
            "Will be released soon: Nim CLI tool"
        ]
    },
    {
        name: "Zig",
        icon: "🦓",
        status: "Learning",
        class: "learn",
        strengths: [
            "Learning low-level systems and memory management.",
            "Tinkering with Zig for fast, safe utilities."
        ],
        pros: [
            "Compiles to ultra-fast binaries.",
            "Good for experimenting with system utilities."
        ],
        cons: [
            "Still picking up Zig syntax.",
            "Limited real-world experience."
        ],
        make: [
            "Tiny CLI utilities",
            "System demos"
        ],
        future: [
            "Zig-powered OS tool"
        ],
        projects: [
            "Will be released soon: Zig system utility"
        ]
    },
    {
        name: "Python",
        icon: "🐍",
        status: "Expert",
        class: "know",
        strengths: [
            "Architect and deploy production-grade applications with advanced design patterns.",
            "Build distributed systems, RESTful APIs, and microservices architectures.",
            "Expert in async/await, multiprocessing, threading, and performance optimization.",
            "Deep proficiency in requests, aiohttp, discord.py, FastAPI, Flask, SQLAlchemy, pandas, numpy."
        ],
        pros: [
            "Design scalable backend systems and enterprise-level applications.",
            "Implement complex data pipelines with parallel processing.",
            "Build production-ready APIs with authentication, rate limiting, and caching.",
            "Expert debugging, profiling, and optimization techniques."
        ],
        cons: [
            "GUI frameworks less frequently used in favor of web interfaces.",
            "Mobile app development requires additional frameworks.",
            "GIL limitations understood and worked around for CPU-intensive tasks."
        ],
        make: [
            "Enterprise Discord bots with database integration and analytics",
            "Distributed web scrapers with proxy rotation and anti-detection",
            "RESTful APIs with JWT authentication and role-based access control",
            "Real-time data processing pipelines with message queues",
            "Advanced OSINT frameworks with automated reconnaissance",
            "ML model deployment with Flask/FastAPI serving",
            "Automated testing frameworks and CI/CD integration"
        ],
        future: [
            "AI-powered Discord bot with natural language processing",
            "Distributed OSINT platform with cluster computing",
            "Real-time analytics dashboard with WebSocket streaming",
            "Automated penetration testing framework"
        ],
        projects: [
            "shadowexif (EXIF metadata removal tool)",
            "Ip-Info-Toolkit (IP intelligence gathering)",
            "Proxy-Verifier-Scraper (proxy validation system)",
            "Exifrecover (metadata recovery tool)",
            "Webhook-spammer (load testing utility)"
        ]
    },
    {
        name: "Rust",
        icon: "🦀",
        status: "Proficient",
        class: "rust",
        strengths: [
            "Build memory-safe, high-performance systems with zero-cost abstractions.",
            "Design concurrent applications using async/await and tokio runtime.",
            "Expert in ownership, borrowing, lifetimes, and trait systems.",
            "Proficient with cargo ecosystem, including custom build scripts and macros."
        ],
        pros: [
            "Architect secure systems with compile-time safety guarantees.",
            "Build high-throughput network services and concurrent tools.",
            "Implement efficient CLI applications with clap and serde.",
            "Cross-compile for multiple platforms with consistent performance."
        ],
        cons: [
            "Compile times can be lengthy for large projects.",
            "GUI development ecosystem still maturing.",
            "Steep learning curve for advanced lifetime scenarios."
        ],
        make: [
            "High-performance CLI tools with async I/O",
            "Concurrent web servers with Actix or Axum",
            "System utilities with direct hardware access",
            "Cryptographic tools with constant-time guarantees",
            "Cross-platform network applications",
            "Custom protocol implementations",
            "Performance-critical microservices"
        ],
        future: [
            "Async web scraper with rate limiting",
            "Terminal-based system monitoring tool",
            "Secure file encryption suite with key management",
            "Low-latency message broker"
        ],
        projects: [
            "In development: Secure file synchronization tool",
            "In development: Async CLI dashboard framework"
        ]
    },
    {
        name: "Go",
        icon: "🐹",
        status: "Expert",
        class: "go",
        strengths: [
            "Architect scalable microservices and distributed systems.",
            "Expert in goroutines, channels, and concurrent design patterns.",
            "Build production-ready APIs with middleware, authentication, and monitoring.",
            "Proficient in the standard library and popular frameworks (Gin, Echo, gRPC)."
        ],
        pros: [
            "Design high-concurrency applications with clean goroutine patterns.",
            "Build containerized microservices with Docker and Kubernetes.",
            "Implement efficient network protocols and streaming services.",
            "Create self-contained binaries with zero runtime dependencies."
        ],
        cons: [
            "Verbose error handling sometimes impacts code brevity.",
            "Generics adoption still evolving in older codebases.",
            "Less suitable for CPU-intensive mathematical computations."
        ],
        make: [
            "Scalable REST APIs with rate limiting and caching",
            "Real-time WebSocket servers with pub/sub",
            "gRPC microservices with load balancing",
            "Concurrent web scrapers with proxy management",
            "Database migration tools and ETL pipelines",
            "System monitoring agents and log aggregators",
            "Load testing frameworks and benchmarking tools"
        ],
        future: [
            "Distributed job queue with Redis backend",
            "Real-time analytics engine with streaming data",
            "Service mesh control plane implementation",
            "Cloud-native monitoring system"
        ],
        projects: [
            "Quotemaker (quote generation service)",
            "In development: Distributed scraping platform",
            "In development: Real-time metrics aggregator"
        ]
    },
    {
        name: "Node.js",
        icon: "🟩",
        status: "Expert",
        class: "know",
        strengths: [
            "Build production-grade Express and Fastify applications.",
            "Expert in async patterns, event-driven architecture, and streams.",
            "Create Discord bots with complex state management and database integration.",
            "Proficient with TypeScript, testing frameworks, and modern tooling."
        ],
        pros: [
            "Architect scalable REST APIs with middleware chains.",
            "Implement WebSocket servers for real-time communication.",
            "Build browser automation with Puppeteer and Playwright.",
            "Deploy serverless functions with AWS Lambda and Vercel."
        ],
        cons: [
            "Frontend frameworks require additional specialization.",
            "Callback complexity managed through modern async/await.",
            "Single-threaded nature understood and mitigated with clustering."
        ],
        make: [
            "Enterprise Discord bots with command frameworks",
            "RESTful APIs with authentication and rate limiting",
            "Real-time WebSocket applications",
            "Browser automation and testing frameworks",
            "Serverless functions and microservices",
            "Data processing pipelines with streams",
            "CLI tools with interactive prompts"
        ],
        future: [
            "Real-time collaborative platform with Socket.io",
            "Discord bot framework with plugin architecture",
            "Automated browser testing suite",
            "Serverless API gateway"
        ],
        projects: [
            "In development: Discord.js bot framework",
            "In development: Express API boilerplate"
        ]
    },
    {
        name: "D",
        icon: "🦑",
        status: "Advanced",
        class: "know",
        strengths: [
            "Build systems-level applications with modern language features.",
            "Implement Bluetooth protocols and low-level hardware interfaces.",
            "Create encryption tools with template metaprogramming.",
            "Leverage compile-time function evaluation for performance."
        ],
        pros: [
            "Design efficient system utilities with garbage collection.",
            "Implement hardware communication protocols.",
            "Build cryptographic applications with manual memory control.",
            "Utilize metaprogramming for code generation."
        ],
        cons: [
            "Smaller ecosystem compared to mainstream languages.",
            "Library documentation can be limited.",
            "Community resources less abundant."
        ],
        make: [
            "Bluetooth communication frameworks",
            "File encryption systems with custom algorithms",
            "System monitoring utilities",
            "Hardware interface libraries",
            "Performance-critical CLI tools",
            "Network protocol implementations"
        ],
        future: [
            "Advanced Bluetooth device scanner with device profiling",
            "Multi-algorithm encryption suite",
            "System resource monitor with alerting"
        ],
        projects: [
            "Bluetooth-Scanner (device discovery tool)",
            "DLang-file-encryptor (secure file encryption)"
        ]
    },
    {
        name: "C++",
        icon: "💻",
        status: "Expert",
        class: "know",
        strengths: [
            "Design high-performance applications with modern C++17/20 features.",
            "Expert in memory management, smart pointers, and RAII patterns.",
            "Build optimized algorithms with template metaprogramming.",
            "Proficient with STL, Boost, and performance profiling tools."
        ],
        pros: [
            "Implement performance-critical components with manual optimization.",
            "Create cross-platform applications with CMake build systems.",
            "Design efficient data structures and algorithms.",
            "Integrate with C libraries and system APIs."
        ],
        cons: [
            "Build complexity increases with project scale.",
            "Manual memory management requires careful attention.",
            "Compilation times can be significant for template-heavy code."
        ],
        make: [
            "High-performance computational tools",
            "Game engines and graphics applications",
            "System-level utilities and drivers",
            "Algorithm implementations with custom optimizations",
            "Cross-platform CLI applications",
            "Network protocol implementations",
            "Real-time processing applications"
        ],
        future: [
            "Custom memory allocator framework",
            "Multi-threaded game engine components",
            "High-frequency data processing tool",
            "Graphics rendering library"
        ],
        projects: [
            "terminal-cpp-calculator (advanced calculator)",
            "word-guess-game (interactive CLI game)"
        ]
    },
    {
        name: "JavaScript",
        icon: "🌐",
        status: "Proficient",
        class: "know",
        strengths: [
            "Build interactive web applications with vanilla JS and modern ES6+.",
            "Implement complex DOM manipulation and event handling.",
            "Create browser extensions and userscripts.",
            "Proficient with async patterns, promises, and fetch API."
        ],
        pros: [
            "Design responsive single-page applications.",
            "Build browser automation and scraping tools.",
            "Implement real-time UI updates with WebSockets.",
            "Create interactive data visualizations."
        ],
        cons: [
            "Framework expertise (React/Vue) requires dedicated focus.",
            "Browser compatibility sometimes requires polyfills.",
            "Styling kept functional rather than design-focused."
        ],
        make: [
            "Interactive web dashboards",
            "Browser extensions with background scripts",
            "Real-time data visualization tools",
            "Form validation and dynamic UI components",
            "API integration with async data fetching",
            "Client-side routing applications"
        ],
        future: [
            "Real-time collaboration tool with WebRTC",
            "Browser-based IDE with syntax highlighting",
            "Interactive data analytics dashboard"
        ],
        projects: [
            "In development: Browser extension framework",
            "In development: Animated metrics dashboard"
        ]
    },
    {
        name: "HTML/CSS",
        icon: "🎨",
        status: "Intermediate",
        class: "know",
        strengths: [
            "Clean landing pages and dashboards.",
            "Responsive layouts, custom portfolios.",
            "Structure and style sites quickly."
        ],
        pros: [
            "Functional sites fast.",
            "Mobile-friendly layouts.",
            "Portfolio/dashboard sites."
        ],
        cons: [
            "Keep CSS simple/readable.",
            "Advanced animations take longer.",
            "Avoid heavy frameworks."
        ],
        make: [
            "Landing pages",
            "Dashboards/portfolios",
            "Web apps"
        ],
        future: [
            "Animated personal portfolio",
            "Dashboard for tracking projects"
        ],
        projects: [
            "This portfolio."
        ]
    },
    {
        name: "C",
        icon: "⚙️",
        status: "Learning",
        class: "learn",
        strengths: [
            "Learning low-level systems and memory.",
            "Tinker with small utilities.",
            "Debug basic C apps."
        ],
        pros: [
            "Understand systems well.",
            "Can troubleshoot simple bugs.",
            "Learning to handle pointers/arrays."
        ],
        cons: [
            "Still slow with big C projects.",
            "Need docs open for syntax.",
            "Prefer scripting for rapid tasks."
        ],
        make: [
            "Small utilities",
            "Simple file tools"
        ],
        future: [
            "C-based file parser",
            "Tiny CLI encryption tool"
        ],
        projects: [
            "Will be released soon: C utilities"
        ]
    },
    {
        name: "C#",
        icon: "🧩",
        status: "Decent",
        class: "know",
        strengths: [
            "Build basic Windows utilities.",
            "Make simple GUIs.",
            "Debug C# apps."
        ],
        pros: [
            "Can make small Windows tools.",
            "Decent at scripting in C#.",
            "Quick at debugging simple C# code."
        ],
        cons: [
            "Learning advanced C# patterns.",
            "Still new to .NET libraries.",
            "GUIs are simple."
        ],
        make: [
            "Windows utilities",
            "Simple GUI apps",
            "Scripts"
        ],
        future: [
            "C# dashboard app",
            "Simple file manager"
        ],
        projects: [
            "Will be released soon: C# utilities"
        ]
    },
    {
        name: "Lua",
        icon: "🦎",
        status: "Learning",
        class: "learn",
        strengths: [
            "Game mods, scripts, and automation.",
            "Easy to embed in other tools."
        ],
        pros: [
            "Game mods quick.",
            "Great for scripting.",
            "Simple syntax."
        ],
        cons: [
            "Limited for big projects.",
            "Mix up Lua/Python sometimes.",
            "Not ideal standalone."
        ],
        make: [
            "Game mods",
            "Scripts and automations"
        ],
        future: [
            "Lua-based mod loader",
            "Automation script suite"
        ],
        projects: [
            "Will be released soon: Lua game mod"
        ]
    },
    {
        name: "Haskell",
        icon: "🔗",
        status: "Learning",
        class: "learn",
        strengths: [
            "Pure function demos, logic puzzles.",
            "Learning functional paradigms."
        ],
        pros: [
            "Fun for code puzzles.",
            "Type-safe code.",
            "Functional brain teasers."
        ],
        cons: [
            "Learning advanced patterns.",
            "Prototyping takes longer.",
            "Smaller community."
        ],
        make: [
            "Pure function demos",
            "Logic puzzles"
        ],
        future: [
            "Haskell puzzle generator"
        ],
        projects: [
            "Will be released soon: Haskell puzzles"
        ]
    }
];

function renderLanguages() {
    const grid = document.getElementById("langSkillsGrid");
    if (!grid) return;
    
    langs.forEach((lang, i) => {
        const card = document.createElement("div");
        card.className = `lang-card ${lang.class}`;
        card.innerHTML = `
            <div class="lang-title">
                <span>${lang.icon}</span>
                ${lang.name}
                <span class="lang-status">${lang.status}</span>
            </div>
            <div class="lang-strengths">
                <ul>
                    ${lang.strengths.map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>
            <div class="lang-make">
                <strong>What I can build:</strong>
                <ul>
                    ${lang.make.map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>
            <div class="lang-future">
                <strong>Future projects:</strong>
                <ul>
                    ${lang.future.map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>
            <div class="proscons">
                <div class="proscons-title">Pros:</div>
                <ul class="proscons-list">
                    ${lang.pros.map(s => `<li>${s}</li>`).join("")}
                </ul>
                <div class="proscons-title">Cons:</div>
                <ul class="proscons-list">
                    ${lang.cons.map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>
            <div class="lang-future" style="color:var(--info);margin-top:1rem">
                <strong>Projects made:</strong>
                <ul>
                    ${lang.projects.map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderLanguages);
} else {
    renderLanguages();
}
