window.blogPosts = window.blogPosts || [];

window.blogPosts.push({
	id: 'custom-tools-windows-c-static-http-server',
	title: 'Building a Static HTTP Web Server in C on Windows',
	category: 'Custom Tools',
	date: '2026-08-14',
	externalPage: 'Custom Tools/winsock-http-server.html',
	summary: 'A practical walkthrough of building a small static file server with C, WinSock, TCP, HTTP parsing, MIME types, and basic directory-traversal protection.',
	content: `<div class="space-y-4">
		<p class="leading-relaxed">I wanted to understand what actually happens underneath a web framework, so I built a small static HTTP server in C for Windows. It does not use Node.js, Apache, or Nginx. It opens a TCP socket with WinSock, waits for a browser, reads the HTTP request, finds the requested file, and sends the file back.</p>
		<p class="leading-relaxed">It is intentionally small, but it covers the important pieces: sockets, IPv4 addresses, HTTP headers, file I/O, MIME types, error handling, and a first layer of protection against directory traversal.</p>

		<div class="quote-box p-4 rounded text-xs text-zinc-300 font-mono">
			<p><strong>Project:</strong> Windows C Static HTTP Web Server</p>
			<p><strong>Platform:</strong> Windows / WinSock2</p>
			<p><strong>Port:</strong> 8080</p>
		</div>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">What the Server Does</h2>
		<p class="leading-relaxed">The server listens on port 8080 and serves files from a <code>public</code> directory. A request for <code>/</code> is mapped to <code>./public/index.html</code>. A request for <code>/style.css</code> maps to <code>./public/style.css</code>, and so on.</p>
		<p class="leading-relaxed">The project directory looks like this:</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">WebServer/
|-- server.c
|-- public/
	|-- index.html
	|-- style.css
	|-- script.js
	|-- image.png
	|-- data.json</code></pre>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">The Request Flow</h2>
		<p class="leading-relaxed">When I open <code>http://localhost:8080/</code>, the browser connects to <code>127.0.0.1:8080</code> and sends a request similar to this:</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">GET / HTTP/1.1
Host: localhost:8080
Connection: keep-alive</code></pre>
		<p class="leading-relaxed">The server extracts the method and path, changes <code>/</code> to <code>/index.html</code>, checks the path, and builds the local filename by joining <code>./public</code> with the request path.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Starting WinSock</h2>
		<p class="leading-relaxed">Before calling any networking functions, the program initializes WinSock and requests version 2.2. The server socket is then created as an IPv4 TCP socket:</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">WSAStartup(MAKEWORD(2, 2), &amp;wsa);
SOCKET server = socket(AF_INET, SOCK_STREAM, 0);</code></pre>
		<p class="leading-relaxed"><code>AF_INET</code> selects IPv4, <code>SOCK_STREAM</code> selects TCP, and the final argument lets Windows choose the matching protocol.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Binding and Listening</h2>
		<p class="leading-relaxed">The address structure is configured for port 8080. Using <code>INADDR_ANY</code> allows the server to listen on the machine's available local interfaces. For local testing, the browser can use <code>localhost</code> or <code>127.0.0.1</code>.</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">addr.sin_family = AF_INET;
addr.sin_addr.s_addr = INADDR_ANY;
addr.sin_port = htons(8080);

bind(server, (struct sockaddr*)&amp;addr, sizeof(addr));
listen(server, 10);</code></pre>
		<p class="leading-relaxed">The value passed to <code>listen</code> is a backlog for pending connections. It does not mean the server can only serve ten clients in total.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Accepting a Browser</h2>
		<p class="leading-relaxed">The original socket keeps listening. Each call to <code>accept</code> returns a separate client socket for the browser connection:</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">SOCKET client = accept(server, NULL, NULL);</code></pre>
		<p class="leading-relaxed">This version is deliberately sequential: accept one client, receive its request, serve the file, close that client, and then wait for the next one. That makes the control flow easy to follow, although a slow client also blocks the next request.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Reading and Parsing HTTP</h2>
		<p class="leading-relaxed">The request is read into a fixed buffer and terminated with a null byte so it can be treated as a C string. The first two fields are the method and requested path.</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">char buffer[2048];
int received = recv(client, buffer, sizeof(buffer) - 1, 0);
buffer[received] = '\\0';

char method[10];
char path[256];
sscanf(buffer, "%9s %255s", method, path);</code></pre>
		<p class="leading-relaxed">The width limits matter. Unrestricted <code>%s</code> conversions could write past the ends of the method or path arrays when given an unexpectedly large request.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Keeping Requests Inside Public</h2>
		<p class="leading-relaxed">Before creating a filesystem path, the server rejects paths containing <code>..</code>. That blocks simple requests such as <code>/../secret.txt</code> from escaping the public directory.</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">if (strstr(path, "..")) {
	send_404(client);
	return;
}

snprintf(full_path, sizeof(full_path), "%s%s", "./public", path);</code></pre>
		<p class="leading-relaxed">This is useful for a learning project, but it is not a complete path-security solution. A production server should URL-decode carefully, canonicalize the final path, validate that it remains under the web root, and decide how symbolic links should be handled.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Choosing the MIME Type</h2>
		<p class="leading-relaxed">The server looks at the last file extension and chooses the matching content type. The table includes HTML, CSS, JavaScript, PNG, JPEG, GIF, ICO, SVG, and JSON files. Unknown extensions fall back to a generic binary type.</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">const char *ext = strrchr(path, '.');

if (ext &amp;&amp; strcmp(ext, ".html") == 0)
	return "text/html";
if (ext &amp;&amp; strcmp(ext, ".css") == 0)
	return "text/css";
if (ext &amp;&amp; strcmp(ext, ".js") == 0)
	return "application/javascript";

return "application/octet-stream";</code></pre>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Sending a File</h2>
		<p class="leading-relaxed">Files are opened with <code>fopen(file_path, "rb")</code>. The server finds the size with <code>fseek</code> and <code>ftell</code>, writes an HTTP 200 response, and then reads the file in 8 KB chunks.</p>
		<pre class="rounded border border-zinc-700 overflow-x-auto"><code class="code-block text-xs">HTTP/1.1 200 OK\r\n
Content-Type: text/html\r\n
Content-Length: 250\r\n
Connection: close\r\n
\r\n</code></pre>
		<p class="leading-relaxed">Reading with <code>fread</code> and sending raw bytes is important. Images and other binary files can contain null bytes, so they must not be treated like ordinary C strings.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">404 Responses</h2>
		<p class="leading-relaxed">If <code>fopen</code> fails, the server sends a small <code>404 Not Found</code> response. The blank line between the headers and body is required: it tells the browser that the headers are finished.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">What I Learned</h2>
		<p class="leading-relaxed">The most useful part of this project was seeing the complete path from a browser request to a file on disk. The familiar sequence is:</p>
		<p class="font-mono text-accent text-sm">WSAStartup -> socket -> bind -> listen -> accept -> recv -> process -> send -> close</p>
		<p class="leading-relaxed">It also made the limits of a small server obvious. TCP does not guarantee that one <code>recv</code> contains a complete HTTP request, and <code>send</code> is allowed to transmit fewer bytes than requested. A more reliable implementation needs request accumulation, header-size limits, complete-send handling, method validation, and better error paths.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Testing Checklist</h2>
		<ul class="list-disc pl-6 space-y-2">
			<li>Open <code>http://localhost:8080/</code> and confirm that <code>public/index.html</code> loads.</li>
			<li>Request a CSS file and check for <code>text/css</code>.</li>
			<li>Request a JavaScript file and check for <code>application/javascript</code>.</li>
			<li>Request an image and confirm that binary data is delivered correctly.</li>
			<li>Request a missing file and confirm a 404 response.</li>
			<li>Try a traversal path such as <code>/../secret.txt</code> and confirm it is rejected.</li>
		</ul>

		<p class="leading-relaxed">This is not meant to replace a production web server. It is a compact way to understand the building blocks that frameworks and mature servers handle for us: TCP connections, HTTP parsing, file access, response headers, and the security decisions between them.</p>
	</div>`,
	code: `#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>

#pragma comment(lib, "Ws2_32.lib")

#define PORT 8080
#define PUBLIC_DIR "./public"

// Core lifecycle:
// WSAStartup -> socket -> bind -> listen -> accept
// -> recv -> parse -> serve_file -> closesocket`
});
