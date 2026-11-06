# Kids Math Game

A browser math game for Zack's kids, nieces and nephews. Built as a single HTML page and published as a shareable claude.ai Artifact so the family can play from any phone, tablet or laptop.

Live game: https://claude.ai/artifact/Uqq2xbuFUCQcpveNf12AAD

`index.html` is the whole game. Progress is saved to the artifact's shared database (`players/<id>`, one document per child) and mirrored in each browser's localStorage, so it still works on devices that can't reach the shared save.
