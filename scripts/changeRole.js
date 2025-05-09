import { changeRole } from "../src/auth_router.js";
try {
    const args = process.argv;
    const username = args[args.indexOf('-u') + 1];
    const role = args[args.indexOf('-r') + 1];
    await changeRole(username, role)
    console.log(`The Role from ${username} was changed to ${role}.`)
} catch (error) {
    console.log(error)
}