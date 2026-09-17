window.blogPosts = window.blogPosts || [];

window.blogPosts.push({
	id: 'reverse-engineering-netmirror-deception',
	title: 'The NetMirror Deception',
	category: 'Reverse Engineering',
	date: '2026-04-04',
	summary: 'A static-analysis deep dive into NetMirror, a suspicious Android streaming APK, its hidden architecture, encoded infrastructure, and dangerous permission logic.',
	content: `<div class="space-y-4">
		<p class="leading-relaxed">I saw some of my friends using an app called NetMirror. If you do not know it, it is an APK for watching pirated movies. The icon was clean, the UI was smooth, and the movies played without lag.</p>
		<p class="leading-relaxed">But something felt really off. A free streaming app that is not on the Play Store, has no official website, and constantly changes its domains deserves careful investigation. Instead of installing it on my actual phone, I decided to take it apart inside a Kali Linux environment.</p>
		<p class="leading-relaxed">After several hours of digging, I found more than advertisements. The code showed patterns consistent with a carefully designed spyware operation that attempts to hide from automated security tools. This post documents the red flags and explains why users should remove the app and avoid reinstalling it.</p>

		<div class="quote-box p-4 rounded text-xs text-zinc-300 font-mono">
			<p>Researched by: addssh</p>
			<p>Tools used: Gemini, Perplexity, Claude, Stack Overflow</p>
		</div>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">How I Did It: My Lab Setup</h2>
		<p class="leading-relaxed">I used static analysis rather than installing the APK on a personal phone. The sample stayed inside an isolated Kali Linux virtual machine so it could not access personal data.</p>
		<ul class="list-disc pl-6 space-y-2">
			<li><strong>apktool:</strong> Decompiling the APK and inspecting its raw folders.</li>
			<li><strong>jadx:</strong> Converting Java bytecode into more readable source code.</li>
			<li><strong>grep:</strong> Searching thousands of files for terms such as password and SMS.</li>
			<li><strong>Base64 decoder:</strong> Revealing web addresses that had been encoded to avoid casual inspection.</li>
			<li><strong>VirusTotal and URLScan:</strong> Checking the domains and indicators against public security services.</li>
		</ul>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Step 1: The Manifest - Hunting for Red Flags</h2>
		<p class="leading-relaxed">The AndroidManifest.xml file is the first place I inspect in a suspicious application. A movie app should usually need little more than internet access and, depending on its design, limited storage access. NetMirror exposed several permissions and settings that did not fit that purpose.</p>
		<ul class="list-disc pl-6 space-y-2">
			<li><strong>WRITE_SETTINGS:</strong> Allows the app to request control over system settings. That capability is unnecessary for ordinary video playback and could support unwanted background behavior.</li>
			<li><strong>ACCESS_WIFI_STATE:</strong> Exposes network connection information that can contribute to device and network fingerprinting.</li>
			<li><strong>BIND_GET_INSTALL_REFERRER_SERVICE:</strong> Can be used to identify the link or campaign that led to an installation, including a Telegram group or shared download URL.</li>
			<li><strong>usesCleartextTraffic=&quot;true&quot;:</strong> Allows unencrypted network traffic, increasing the risk of interception on an untrusted network. This is relevant to a man-in-the-middle attack.</li>
		</ul>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Step 2: The Sneaky Architecture</h2>
		<p class="leading-relaxed">The Java side of the app appeared unusually ordinary. NetMirror is built with React Native, so the Java layer acts mostly as a shell while the application logic lives inside <code>assets/index.android.bundle</code>.</p>
		<p class="leading-relaxed">That bundle uses Hermes bytecode. <code>hermes-dec</code> can disassemble and decompile React Native files compiled into the Hermes VM bytecode format, but this extra layer creates a blind spot for scanners that only inspect ordinary Java source.</p>
		<p class="leading-relaxed">Automated scanning did not reveal the suspicious behavior immediately. Extracting readable strings from the binary bundle and manually reviewing them proved much more useful than relying on a single automated scan.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Step 3: Cracking the Secret Servers</h2>
		<p class="leading-relaxed">The bundle contained strings that appeared to be Base64 encoded. Decoding them revealed infrastructure using the MobiDetect name:</p>
		<ul class="list-disc pl-6 space-y-2 font-mono text-xs">
			<li>https://mobidetects.live</li>
			<li>https://mobidetects.store</li>
			<li>https://mobidetects.pro</li>
			<li>https://mobidetect.app</li>
			<li>https://mobidetect.art</li>
		</ul>
		<p class="leading-relaxed">The domains appeared to share the same registration date and used domain-parking pages that made them look inactive. A free movie application has no obvious reason to conceal its server addresses in encoded strings, so this infrastructure deserved further investigation.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Step 5: The Permission Trap</h2>
		<p class="leading-relaxed">A review of the JavaScript bundle exposed references to sensitive capabilities that were not visible in the initial manifest review, including SMS, call-log, and phone-call access.</p>
		<p class="leading-relaxed">This creates the possibility of a staged attack: the app may begin with an apparently harmless installation, fingerprint the device, and later display a deceptive prompt for more sensitive permissions. If a user grants those permissions, private messages, call information, and two-factor authentication codes could be exposed.</p>
		<p class="leading-relaxed">This is also a social-engineering risk. The permission prompt may be presented as account verification or an application update rather than explaining its real purpose.</p>

		<h2 class="text-xl font-bold font-mono text-zinc-100 pt-4">Step 7: Putting It All Together</h2>
		<p class="leading-relaxed">The hidden domains, encoded strings, unusual libraries, and permission references point toward a surveillance-focused design rather than a simple streaming application.</p>
		<ul class="list-disc pl-6 space-y-2">
			<li><strong>Permanent identity fingerprinting:</strong> A library such as RNDeviceInfo can expose device identifiers, SIM information, Android ID, battery state, and connected accessories.</li>
			<li><strong>Credential scraping:</strong> Injected JavaScript can potentially inspect selected text through <code>window.getSelection()</code>, while native libraries may target credentials entered into embedded login pages.</li>
			<li><strong>Ad fraud and invisible clicks:</strong> Code such as <code>dispatchTouchEvent</code> can simulate touch events, potentially generating hidden ad clicks and consuming battery and mobile data.</li>
		</ul>
		<p class="leading-relaxed">Viewed separately, some behaviors might look like aggressive tracking. Together, the hidden infrastructure, staged permissions, and credential-access patterns indicate a serious spyware risk. NetMirror should be treated as untrusted software and removed from affected devices.</p>
	</div>`,
	code: `# Static-analysis indicators observed during review
assets/index.android.bundle
WRITE_SETTINGS
ACCESS_WIFI_STATE
BIND_GET_INSTALL_REFERRER_SERVICE
usesCleartextTraffic="true"
READ_SMS
READ_CALL_LOG
CALL_PHONE
window.getSelection()
dispatchTouchEvent`
});

window.blogPosts.push({
	id: 'reverse-engineering-jailbreak-chatgpt',
	title: 'When a Roleplay Prompt Tries to Become the Operator',
	category: 'Reverse Engineering',
	date: '2026-09-15',
	summary: 'A defensive analysis of persona locks, coded requests, and capability escalation in jailbreak prompts.',
	externalPage: './Reverse Engineering/jailbreak chatgpt.html'
});
