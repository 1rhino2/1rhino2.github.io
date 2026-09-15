// pulls the repo list off github, thats it

var msg = document.getElementById('repo-status');
var list = document.getElementById('repo-list');
var skip = ['RhinoWAFNoah'];

fetch('https://api.github.com/users/1rhino2/repos?per_page=100&sort=pushed')
  .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function (repos) {
    var n = 0;
    repos.forEach(function (r) {
      if (r.fork || skip.indexOf(r.name) >= 0) return;
      n++;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = r.html_url;
      a.textContent = r.name;
      li.appendChild(a);
      var txt = r.description ? ' - ' + r.description : '';
      if (r.stargazers_count) txt += ' (' + r.stargazers_count + '*)';
      li.appendChild(document.createTextNode(txt));
      list.appendChild(li);
    });
    msg.textContent = n + ' repos';
  })
  .catch(function () {
    // github rate limits sometimes, link below still works
    msg.textContent = 'github didnt answer';
  });
