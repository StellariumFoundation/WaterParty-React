import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync('./database.sqlite');
db.prepare('DELETE FROM parties WHERE HostID NOT IN (SELECT ID FROM users)').run();
console.log("Orphaned parties deleted.");
