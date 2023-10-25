import type { CmdContext } from '../../Core/Typings/types.js';
import { clearTemp } from '../../Core/Components/Utils.js';
import Command from '../../Core/Classes/Command.js';
import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { AnyMessageContent } from 'baileys';

type msgMedia = {
	audio?: Buffer;
	video?: Buffer;
	document?: Buffer;
	mimetype: str;
	ptt?: bool;
	fileName: str;
};

export default class extends Command {
	constructor() {
		super({
			aliases: ['d'],
			cooldown: 10,
		});
	}

	async run({ bot, msg, args, sendUsage, t }: CmdContext) {
		const mediaOptions = ['video', 'v', 'audio', 'a'];

		if (!args[1] || !mediaOptions.includes(args[0])) return sendUsage();

		const isVideo = args[0] === 'video' || args[0] === 'v';

		let path, msgBody: msgMedia, file: Buffer, ytdlArgs = [];

		if (isVideo) {
			ytdlArgs.push('--remux-video mp4');
			path = `temp/${Math.random()}.mp4`;
			msgBody = { video: file!, mimetype: 'video/mp4', fileName: 'video.mp4' };
		} else {
			ytdlArgs.push('-x', '--audio-format mp3');
			path = `temp/${Math.random()}.mp3`;
			msgBody = {
				document: file!,
				mimetype: 'audio/mpeg',
				fileName: `audio.mp3`,
				ptt: true,
			};
		}

		ytdlArgs.push(
			`-o ${path}`,
			`-u "${process.env.SOCIAL_USERNAME}"`,
			`-p "${process.env.SOCIAL_PASSWORD}"`,
		);

		try {
			await bot.send(msg, t(`download.${isVideo}`));
			execSync(`yt-dlp ${ytdlArgs.join(' ')} ${args[1]}`);

			const file = readFileSync(path);

			attachMedia(msgBody, file, path);
			await bot.send(msg, msgBody as AnyMessageContent);

			clearTemp();
		} catch (e: any) {
			// remove yt-dlp cli to prevent showing social password
			const error = (e?.stack || e).replace(ytdlArgs.join(' '), 'yt-dlp');

			bot.send(msg, `YT-DLP Error: ${error}`);
		}
		return;
	}
}

function attachMedia(obj: msgMedia, data: Buffer, path: str) {
	const stat = statSync(path);

	if (obj.video && stat.size / 1024 / 1024 < 40) return obj.video = data;

	delete obj.video;
	return obj.document = data;
}
