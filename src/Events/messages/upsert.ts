import config from '../../Core/JSON/config.json' assert { type: 'json' };
import type { CmdContext } from '../../Core/Typings/types.js';
import { getCtx } from '../../Core/Components/Utils.js';
import bot from '../../Core/Classes/Bot.js';
import { type proto } from 'baileys';
import i18next from 'i18next';

export default async function (this: bot, raw: { messages: proto.IWebMessageInfo[] }, e: str) {
	if (!raw.messages[0].message) return;

	// get abstract msg obj
	const { msg, group, user, prisma } = await getCtx(raw.messages[0], this);

	// run 'waitFor' events
	if (this.wait.has(e)) this.wait.get(e)!.bind(this)(msg);

	if (!msg.text.startsWith(user.prefix)) return;

	const args: str[] = msg.text.replace(user.prefix, '').trim().split(' ');
	const callCmd = args.shift()!.toLowerCase()!;
	// search command by name or by aliases
	const cmd = this.cmds.get(callCmd) || this.cmds.get(this.aliases.get(callCmd)!);
	// get locales function

	if (!cmd) return;
	// block only devs cmds for normal people
	if (cmd.access?.onlyDevs && !config.DEVS.includes(user.id)) return this.react(msg, '🚫');

	const sendUsage = async () => {
		args[0] = cmd.name;

		this.cmds.get('help').run(ctx);
		this.react(msg, '🤔');
		return;
	};

	const ctx: CmdContext = {
		t: i18next.getFixedT(user.lang),
		bot: this,
		sendUsage,
		callCmd,
		prisma,
		group,
		args,
		user,
		cmd,
		msg,
	};

	try {
		// start typing (expires after about 10 seconds.)
		this.sock.sendPresenceUpdate('composing', msg.chat);

		cmd.run!(ctx);
	} catch (e: any) {
		this.send(msg, `[⚠️] ${e?.stack || e}`);

		this.react(msg, '❌');
	}

	return;
}
