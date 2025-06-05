# How to Get AdsPower WebSocket URL

Follow these steps to obtain the WebSocket URL from your AdsPower browser:

1. **Open AdsPower Browser**:
   - Launch your AdsPower browser with the profile you want to use for automation

2. **Access Developer Tools**:
   - Press `F12` or right-click anywhere and select "Inspect Element"
   - This will open the browser's Developer Tools panel

3. **Find the WebSocket URL**:
   - In the Developer Tools, click on the three dots menu (⋮) in the top right corner
   - Select "More tools" > "Remote devices"
   - Look for text that says "DevTools listening on..." which contains your WebSocket URL
   - The URL will look something like: `ws://127.0.0.1:44209/devtools/browser/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

   ![Finding WebSocket URL](https://i.imgur.com/example.png)

   > Note: This is the URL that allows Playwright to connect to your browser

4. **Copy the WebSocket URL**:
   - Copy the entire URL (starting with `ws://`)
   - You'll use this URL when running the automation script

## Alternative Method (Command Line)

If you're comfortable with the command line, you can also find the WebSocket URL by:

1. Open a terminal
2. Run: `ps aux | grep AdsPower`
3. Look for a line containing `--remote-debugging-port=XXXXX`
4. The WebSocket URL will be: `ws://127.0.0.1:XXXXX/devtools/browser/YYYYY`
   (You may need to find the browser ID by connecting to `http://127.0.0.1:XXXXX/json/version`)
