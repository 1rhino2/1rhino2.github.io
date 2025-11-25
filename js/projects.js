// Auto-update projects using GitHub API
async function fetchProjects() {
    const grid = document.getElementById("projectsGrid");
    if (!grid) return;
    
    grid.innerHTML = `<div class="project-card"><em>Loading projects...</em></div>`;
    
    try {
        const res = await fetch("https://api.github.com/users/1rhino2/repos?sort=updated&per_page=100");
        const repos = await res.json();
        grid.innerHTML = "";
        
        if (!Array.isArray(repos) || repos.length === 0) {
            grid.innerHTML = `<div class="project-card"><em>No projects found.</em></div>`;
            return;
        }
        
        repos.forEach((repo) => {
            let favorite = (repo.name.toLowerCase() === "shadowexif") ? "favorite" : "";
            let desc = repo.description || "No description yet.";
            let lang = repo.language || "Unknown";
            let stars = repo.stargazers_count || 0;
            let meta = `<b>Language:</b> ${lang} | <b>⭐</b> ${stars}`;
            let links = `<div class="project-links"><a href="${repo.html_url}" target="_blank">Repo</a>`;
            
            if (repo.name.toLowerCase() === "shadowexif") {
                links += `<a href="https://pypi.org/project/shadowexif/" target="_blank">PyPI</a>`;
                links += `<a href="https://github.com/1rhino2/shadowexif#readme" target="_blank">README</a>`;
            } else if (repo.name.toLowerCase() === "exifrecover") {
                links += `<a href="https://github.com/1rhino2/Exifrecover#readme" target="_blank">README</a>`;
            }
            
            links += `</div>`;
            
            const card = document.createElement("div");
            card.className = `project-card ${favorite}`;
            card.innerHTML = `
                <div class="project-title">${repo.name}</div>
                <div class="project-desc">${desc}</div>
                <div class="project-meta">${meta}</div>
                ${links}
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = `<div class="project-card"><em>Couldn't load projects. Try again later.</em></div>`;
        console.error('Error fetching projects:', e);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchProjects);
} else {
    fetchProjects();
}
