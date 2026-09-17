tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                darkbg: '#18181b',
                cardbg: '#242428',
                accent: '#00bcd4',
                accenthover: '#00acc1',
                bordercolor: '#3f3f46',
                darkred: '#8b0000',
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
                sans: ['Inter', 'sans-serif'],
            }
        }
    }
};

// Default Seed Data
const defaultPosts = []; /*
    {
        id: '1',
        title: 'Building Custom Memory Scanner & Hooking Tools in C++',
        category: 'Custom Tools',
        date: '2026-03-10',
        summary: 'An architectural breakdown on building lightweight process memory scanners, pattern matching algorithms, and API hooking in Windows environments using C++.',
        content: `<p class="leading-relaxed">When analyzing reverse engineering challenges or game binaries, relying exclusively on generic debuggers can often feel limiting. Building custom memory scanners and dynamic API hooking utilities in C++ provides exact control over process inspection.</p>
        <p class="leading-relaxed">In this walkthrough, we examine how to open process handles with target permissions, scan virtual memory regions using <code>VirtualQueryEx</code>, and perform pattern matching (signature scanning) to isolate dynamic function addresses.</p>
        <div class="quote-box p-4 rounded text-xs text-zinc-300 my-4 font-mono">
            "Understanding native memory structures and Windows Internals is the cornerstone of writing effective security diagnostics and exploit payload mechanics."
        </div>`,
        code: `#include <windows.h>
#include <iostream>

void ScanProcessMemory(HANDLE hProcess, DWORD pattern) {
    MEMORY_BASIC_INFORMATION mbi;
    unsigned char* addr = 0;

    while (VirtualQueryEx(hProcess, addr, &mbi, sizeof(mbi))) {
        if (mbi.State == MEM_COMMIT && !(mbi.Protect & PAGE_GUARD)) {
            // Pattern scanning logic across memory page
            std::cout << "[+] Scanning Page at: 0x" << std::hex << (uintptr_t)addr << std::endl;
        }
        addr += mbi.RegionSize;
    }
}`
    },
    {
        id: '2',
        title: 'Web App Security: Finding IDOR & Logic Flaws in Modern APIs',
        category: 'Web Security',
        date: '2026-02-28',
        summary: 'Detailed methodologies for discovering complex Insecure Direct Object References (IDOR) and broken object-level authorization across GraphQL and REST endpoints.',
        content: `<p class="leading-relaxed">During web application security assessments and bug hunting, automated vulnerability scanners frequently miss authorization bypasses. Insecure Direct Object Reference (IDOR) flaws remain among the most critical logic flaws found in enterprise APIs.</p>
        <p class="leading-relaxed">To reliably hunt for IDORs, always maintain two distinct user roles (User A and User B) in Burp Suite, systematically swapping UUIDs, object references, and state-changing HTTP headers.</p>`,
        code: `POST /api/v2/user/invoice HTTP/1.1
Host: target-api.internal
Authorization: Bearer <USER_A_TOKEN>
Content-Type: application/json

{
  "account_id": "9842", // Replace with User B's target ID
  "action": "download_pdf"
}`
    },
    {
        id: '3',
        title: 'Reverse Engineering Windows Executables with Ghidra & IDA Pro',
        category: 'Reverse Engineering',
        date: '2026-02-14',
        summary: 'A complete beginner-to-intermediate walkthrough of decompiling PE binaries, analyzing control flow graphs, and renaming stripped functions in Ghidra.',
        content: `<p class="leading-relaxed">Software reverse engineering requires transitioning back and forth between disassembly (Assembly code instructions) and decompilation (C-like pseudo code). Both Ghidra and IDA Pro offer robust decompilation engines to make sense of complex binaries.</p>
        <p class="leading-relaxed">In this guide, we break down how to identify entry points, reconstruct key structs, and follow xrefs (cross-references) to locate critical authentication and validation logic.</p>`,
        code: `// Decompiled C snippet from Ghidra
undefined4 validate_license(char *param_1) {
    size_t sVar1;
    sVar1 = strlen(param_1);
    if (sVar1 == 0x10) {
        if (param_1[0] == 'A' && param_1[3] == 'D') {
            return 1; // Validation Success
        }
    }
    return 0;
}`
    }
]; */

// Global Application State
let posts = [];
let isAdmin = false;
let activeCategory = 'All';
const folderPosts = window.blogPosts || [];
const BLOG_DATA_VERSION = 'empty-blog-2026-09-14';

// Load posts from localStorage or seed
function initData() {
    if (localStorage.getItem('aaditya_blog_data_version') !== BLOG_DATA_VERSION) {
        localStorage.removeItem('aaditya_blog_posts');
        localStorage.setItem('aaditya_blog_data_version', BLOG_DATA_VERSION);
    }

    const stored = localStorage.getItem('aaditya_blog_posts');
    if (stored) {
        try {
            posts = mergePosts(folderPosts, JSON.parse(stored));
        } catch(e) {
            posts = folderPosts.length ? folderPosts : defaultPosts;
        }
    } else {
        posts = folderPosts.length ? folderPosts : defaultPosts;
        savePostsToStorage();
    }
    renderPosts();
    updateCategoryCounts();
}

function mergePosts(sourcePosts, savedPosts) {
    const mergedPosts = [...sourcePosts];

    savedPosts.forEach(savedPost => {
        const existingIndex = mergedPosts.findIndex(post =>
            post.id === savedPost.id || post.title === savedPost.title
        );

        if (existingIndex === -1) {
            mergedPosts.push(savedPost);
        } else {
            mergedPosts[existingIndex] = { ...mergedPosts[existingIndex], ...savedPost };
        }
    });

    return mergedPosts;
}

function savePostsToStorage() {
    localStorage.setItem('aaditya_blog_posts', JSON.stringify(posts));
}

// Navigation Controller
function navigateTo(viewName) {
    document.getElementById('view-blog').classList.add('hidden');
    document.getElementById('view-about').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');

    if (viewName === 'home') {
        document.getElementById('view-blog').classList.remove('hidden');
        closePostReader();
    } else if (viewName === 'about') {
        document.getElementById('view-about').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'admin') {
        if (!isAdmin) {
            openAdminModal();
        } else {
            document.getElementById('view-admin').classList.remove('hidden');
            renderAdminTable();
        }
    }
}

// Render Posts Feed
function renderPosts() {
    const container = document.getElementById('posts-container');
    const header = document.getElementById('category-header');
    const title = document.getElementById('current-category-title');

    if (activeCategory !== 'All') {
        header.classList.remove('hidden');
        title.innerText = activeCategory;
    } else {
        header.classList.add('hidden');
    }

    const filtered = activeCategory === 'All'
        ? posts
        : posts.filter(p => p.category === activeCategory);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="bg-cardbg p-8 rounded border border-bordercolor text-center font-mono text-zinc-400">
                No articles found in category "${activeCategory}".
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(post => `
        <article class="bg-cardbg p-6 sm:p-8 rounded-lg border border-bordercolor space-y-4 hover:border-zinc-500 transition">
            <div class="flex flex-wrap justify-between items-center text-xs font-mono text-zinc-400 gap-2">
                <span class="px-2 py-0.5 rounded bg-zinc-900 text-cyan-400 border border-zinc-700">${escapeHtml(post.category)}</span>
                <span><i class="fa-regular fa-calendar mr-1"></i>${escapeHtml(post.date)}</span>
            </div>

            ${post.externalPage
                ? `<h2 class="text-xl sm:text-2xl font-bold font-mono text-zinc-100 hover:text-accent cursor-pointer transition"><a href="${escapeHtml(post.externalPage)}" class="hover:text-accent">${escapeHtml(post.title)}</a></h2>`
                : `<h2 class="text-xl sm:text-2xl font-bold font-mono text-zinc-100 hover:text-accent cursor-pointer transition" onclick="openPostReader('${post.id}')">${escapeHtml(post.title)}</h2>`}

            <p class="text-zinc-300 text-sm leading-relaxed">
                ${escapeHtml(post.summary)}
            </p>

            <div class="pt-3 flex justify-between items-center text-xs font-mono">
                ${post.externalPage
                    ? `<a href="${escapeHtml(post.externalPage)}" class="text-accent hover:underline flex items-center gap-1 font-bold">Open Project Page <i class="fa-solid fa-arrow-right text-[10px]"></i></a>`
                    : `<button onclick="openPostReader('${post.id}')" class="text-accent hover:underline flex items-center gap-1 font-bold">Read Walkthrough <i class="fa-solid fa-arrow-right text-[10px]"></i></button>`}
            </div>
        </article>
    `).join('');

    updateCategoryCounts();
}

// Open Article Reader
function openPostReader(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const postsContainer = document.getElementById('posts-container');
    const categoryHeader = document.getElementById('category-header');
    const singleView = document.getElementById('single-post-view');
    const contentDiv = document.getElementById('single-post-content');

    postsContainer.classList.add('hidden');
    categoryHeader.classList.add('hidden');
    singleView.classList.remove('hidden');

    contentDiv.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap justify-between items-center text-xs font-mono text-zinc-400 gap-2">
                <span class="px-2 py-0.5 rounded bg-zinc-900 text-cyan-400 border border-zinc-700">${escapeHtml(post.category)}</span>
                <span>Published: ${escapeHtml(post.date)}</span>
            </div>

            <h1 class="text-2xl sm:text-3xl font-bold font-mono text-zinc-100">${escapeHtml(post.title)}</h1>
            <div class="text-xs font-mono text-zinc-400 border-b border-zinc-700 pb-4">
                By Aaditya Sharma | Web Application Security & Reverse Engineering
            </div>
        </div>

        <div class="text-zinc-300 text-sm space-y-4 pt-2">
            ${post.content}
        </div>

        ${post.code ? `
            <div class="mt-6 space-y-2">
                <span class="text-xs font-mono text-zinc-400">Technical Code / Request Snippet:</span>
                <pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">${escapeHtml(post.code)}</code></pre>
            </div>
        ` : ''}
    `;

    document.querySelectorAll('pre code').forEach((el) => {
        hljs.highlightElement(el);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closePostReader() {
    document.getElementById('posts-container').classList.remove('hidden');
    document.getElementById('single-post-view').classList.add('hidden');
    renderPosts();
}

// Category Filter Function
function filterCategory(cat) {
    activeCategory = cat;
    navigateTo('home');
    renderPosts();
}

function updateCategoryCounts() {
    const countWeb = posts.filter(p => p.category === 'Web Security').length;
    const countRe = posts.filter(p => p.category === 'Reverse Engineering').length;
    const countTools = posts.filter(p => p.category === 'Custom Tools').length;
    const countMalware = posts.filter(p => p.category === 'Malware Research').length;

    if(document.getElementById('count-web')) document.getElementById('count-web').innerText = countWeb;
    if(document.getElementById('count-re')) document.getElementById('count-re').innerText = countRe;
    if(document.getElementById('count-tools')) document.getElementById('count-tools').innerText = countTools;
    if(document.getElementById('count-malware')) document.getElementById('count-malware').innerText = countMalware;
}

// Admin Modal & Verification
function openAdminModal() {
    if (isAdmin) {
        navigateTo('admin');
    } else {
        document.getElementById('admin-auth-modal').classList.remove('hidden');
    }
}

function closeAdminModal() {
    document.getElementById('admin-auth-modal').classList.add('hidden');
    document.getElementById('auth-error').classList.add('hidden');
}

function verifyAdminPass() {
    const pass = document.getElementById('admin-pass-input').value;
    if (pass === 'admin123') {
        isAdmin = true;
        closeAdminModal();
        document.getElementById('admin-pass-input').value = '';
        navigateTo('admin');
    } else {
        document.getElementById('auth-error').classList.remove('hidden');
    }
}

function logoutAdmin() {
    isAdmin = false;
    navigateTo('home');
}

// CRUD Operations
function handlePostSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('form-post-id').value;
    const title = document.getElementById('form-title').value;
    const category = document.getElementById('form-category').value;
    const summary = document.getElementById('form-summary').value;
    const content = document.getElementById('form-content').value;
    const code = document.getElementById('form-code').value;

    if (editId) {
        const index = posts.findIndex(p => p.id === editId);
        if (index !== -1) {
            posts[index] = { ...posts[index], title, category, summary, content, code };
        }
    } else {
        const newPost = {
            id: Date.now().toString(),
            title,
            category,
            date: new Date().toISOString().split('T')[0],
            summary,
            content: `<p class="leading-relaxed">${escapeHtml(content)}</p>`,
            code
        };
        posts.unshift(newPost);
    }

    savePostsToStorage();
    resetForm();
    renderAdminTable();
    renderPosts();
}

function resetForm() {
    document.getElementById('post-form').reset();
    document.getElementById('form-post-id').value = '';
}

function editPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('form-post-id').value = post.id;
    document.getElementById('form-title').value = post.title;
    document.getElementById('form-category').value = post.category;
    document.getElementById('form-summary').value = post.summary;
    document.getElementById('form-content').value = post.content.replace(/<[^>]*>?/gm, '');
    document.getElementById('form-code').value = post.code || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deletePost(id) {
    const index = posts.findIndex(p => p.id === id);
    if (index !== -1) {
        posts.splice(index, 1);
        savePostsToStorage();
        renderAdminTable();
        renderPosts();
    }
}

function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = posts.map(post => `
        <tr class="hover:bg-zinc-900/50">
            <td class="p-2 font-bold text-zinc-100">${escapeHtml(post.title)}</td>
            <td class="p-2 text-cyan-400">${escapeHtml(post.category)}</td>
            <td class="p-2 text-zinc-400">${escapeHtml(post.date)}</td>
            <td class="p-2 text-right space-x-2">
                <button onclick="editPost('${post.id}')" class="text-xs text-accent hover:underline">Edit</button>
                <button onclick="deletePost('${post.id}')" class="text-xs text-red-400 hover:underline">Delete</button>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.onload = function() {
    initData();
};
