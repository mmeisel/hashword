No password is ever stored within the extension, or anywhere else for that matter!

How do I use it?

1. Click in the password field on any web site.
2. Click the Hashword button in your browser toolbar (or better yet, assign it a keyboard shortcut in your extension settings).
3. Type your master password and hit enter. Hashword will fill in the password field for you.
4. Log in!


Is Hashword right for me?

That depends -- how paranoid are you?

If you answered "not very", go with the convenience of a more full-featured password manager. I recommend LastPass.

If you answered "WHO WANTS TO KNOW?!", then Hashword is for you! It's for those of us (myself included) that don't trust ANYONE to hold on to our passwords for us. If you're in this category, keep reading.


How is Hashword different from other password managers?

There are basically two types of password managers out there: those that save your passwords, and those that don't.

In the first category are services like LastPass and 1password. They also have sophisticated browser extensions that will fill in your username and password automatically. You can choose passwords as you normally would, or let the extension generate them for you. But whatever you do, these services send your passwords to their servers and store them there. You have to trust them neither to get hacked nor share your information with third parties.

Hashword falls in the second category, along with the tools that inspired it, such as PwdHash and SuperGenPass. These tools generate your passwords on-demand given a master password and the URL of the web site you are visiting. They use a cryptographic hash function to guarantee that the master password cannot be recovered from generated passwords. Hash functions also generate the same password each time for the same site, but different passwords across different sites (with extremely high probability). There is no need to save or store any password anywhere.

I wrote Hashword to address a few major shortcomings of the existing hash-based password tools I could find:

- Many are bookmarklets, which are inherently insecure since they run within the web page you are logging in to. A malicious site could easily steal your master password without you knowing it. A browser extension is not accessible to web sites you visit, so it does not suffer from this problem.

- Other Chrome extensions require a lot of permissions, typically the permission to read the content of all of the web sites you visit. You have to trust the extension developer not to use these powers for evil. Hashword requires absolutely no special permissions.

- Different web sites have different (and conflicting) requirements for passwords -- password length, presence of symbols, need to change your password from time to time, etc. Many of these tools didn't address this, or at least not in a general enough way. Hashword has a few simple options designed to allow you to generate passwords for any web site.


How does it work?

First, Hashword takes the master password you type, appends the domain of the web site you're using it on, and runs the whole thing through the SHA-3 cryptographic hash function (see http://en.wikipedia.org/wiki/SHA-3). This means that you can be confident that your master password is safe, even if an attacker knows you are using Hashword. It also means that, even if you always use the same master password, SHA-3 will output (with absurdly high probability) a unique bundle of bits for each web site.

The input to the hash function also includes a "generation" number for sites that make you change your password from time to time (or if your password is compromised). Just increase the generation number to get a brand new password.

Next, Hashword uses its own algorithm to convert the bits of the hash to a set of letters, numbers, and (optionally) symbols that you can use as a password. As far as I know, Hashword is unique among hash-based password generators in that it uses the ENTIRE hash to generate the password. In other words, there is a one-to-one mapping from hash to password. Other password generators simply truncate the hash once they have the appropriate number of characters. This means that, in theory, the passwords generated by Hashword have the same probability of collision as the hash function itself. The probabilities in play are so minuscule that this probably doesn't matter at all, but the ultra paranoid may find it comforting.