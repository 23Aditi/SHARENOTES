// const BASE = "http://localhost:3000/api/books";
// const BASE = "http://98.84.15.203:3000/api/books";

const BASE = `${window.location.origin}/api/books`;
let currentPage = 1;
let currentSearch = "";

// Upload
async function upload() {
  const file = document.getElementById("file").files[0];
  const title = document.getElementById("title").value.trim();
  const desc = document.getElementById("desc").value.trim();

  if (!file || !title || !desc) {
    showToast("Please fill all fields", "error");
    return;
  }

  const btn = document.querySelector(".upload-btn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try {
    // 1. get presigned upload URL
    const res1 = await fetch(`${BASE}/upload-url?name=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}`, {
      method: "POST",
    });
    if (!res1.ok) throw new Error("Failed to get upload URL");
    const { url, fileKey } = await res1.json();

    // 2. upload to S3 — Content-Type header is required for presigned URL to accept the request
    const s3Res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    if (!s3Res.ok) throw new Error("S3 upload failed");

    // 3. save metadata
    const saveRes = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, fileKey }),
    });
    if (!saveRes.ok) throw new Error("Failed to save book metadata");

    // reset form
    document.getElementById("title").value = "";
    document.getElementById("desc").value = "";
    document.getElementById("file").value = "";
    document.getElementById("file-label").textContent = "Choose file";

    showToast("Book uploaded successfully!");
    loadBooks(1);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Upload failed", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Upload";
  }
}

// Load books
async function loadBooks(page = 1) {
  currentPage = page;
  currentSearch = document.getElementById("search").value;

  const container = document.getElementById("books");
  container.innerHTML = `<div class="loading">Loading...</div>`;

  try {
    const res = await fetch(`${BASE}?page=${page}&limit=6&search=${encodeURIComponent(currentSearch)}`);
    const data = await res.json();

    container.innerHTML = "";

    if (!data.data.length) {
      container.innerHTML = `<p class="empty">No books found.</p>`;
      document.getElementById("pagination").innerHTML = "";
      return;
    }

    data.data.forEach((book) => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="card-body">
          <div class="card-icon">📖</div>
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(book.description)}</p>
        </div>
        <div class="card-actions">
          <button class="btn btn-download" onclick="download('${book._id}')">↓ Download</button>
          <button class="btn btn-edit" onclick="editBook('${book._id}', ${JSON.stringify(escapeHtml(book.title))}, ${JSON.stringify(escapeHtml(book.description))})">Edit</button>
          <button class="btn btn-delete" onclick="deleteBook('${book._id}')">Delete</button>
        </div>
      `;
      container.appendChild(div);
    });

    renderPagination(data.totalPages, data.page);
  } catch (err) {
    container.innerHTML = `<p class="empty">Failed to load books.</p>`;
  }
}

// Download
async function download(id) {
  try {
    const res = await fetch(`${BASE}/${id}/download-url`);
    const data = await res.json();
    window.open(data.url, "_blank");
  } catch {
    showToast("Download failed", "error");
  }
}

// Delete
async function deleteBook(id) {
  if (!confirm("Delete this book?")) return;
  try {
    await fetch(`${BASE}/${id}`, { method: "DELETE" });
    showToast("Book deleted");
    loadBooks(currentPage);
  } catch {
    showToast("Delete failed", "error");
  }
}

// Edit
async function editBook(id, oldTitle, oldDesc) {
  const title = prompt("New title", oldTitle);
  if (title === null) return;
  const desc = prompt("New description", oldDesc);
  if (desc === null) return;

  try {
    await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    });
    showToast("Book updated");
    loadBooks(currentPage);
  } catch {
    showToast("Update failed", "error");
  }
}

// Pagination
function renderPagination(totalPages, currentP) {
  const container = document.getElementById("pagination");
  container.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentP ? " active" : "");
    btn.innerText = i;
    btn.onclick = () => loadBooks(i);
    container.appendChild(btn);
  }
}

// Toast notifications
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show " + type;
  setTimeout(() => toast.className = "toast", 3000);
}

// File input label update
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("file").addEventListener("change", function () {
    document.getElementById("file-label").textContent = this.files[0]?.name || "Choose file";
  });
});

// XSS protection
function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

loadBooks();