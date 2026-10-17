# Put your music here

Drop audio files into this folder (any names), then run:

    npm run music

Accepted: .mp3 .m4a .aac .ogg .oga .opus .wav .flac .webm (artwork: a .jpg/.png/.webp with the same base name).

`npm run music` (also run automatically before `dev` and `build`):
- hashes each original file (SHA-256). The hero track's hash goes into Alice's signed offer (`x` tag), so every licence is tied to those exact bytes;
- makes a 30-second MP3 preview in `previews/` (ffmpeg);
- writes `tracks.json` (read by the app) and `CREDITS.md`;
- creates or updates `music.json`: edit it to set each file's real title, artist, licence, source URL and which cast member plays it (`cast`: alice, dave, carol, erin, frank, grace; `demoTitle`: the story name, e.g. "Rain").

The first file (alphabetically) becomes Alice's "Rain" unless music.json says otherwise.
