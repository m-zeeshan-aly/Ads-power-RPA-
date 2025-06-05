# To run this script, you need to:
# 1. Start AdsPower browser
# 2. Get the WebSocket URL from browser DevTools (see HOW_TO_GET_WEBSOCKET_URL.md) 
# 3. Update the WS_ENDPOINT value below with the new URL
# 4. Run the script

echo "Getting a fresh WebSocket URL for AdsPower..."
echo "Follow these steps:"
echo "1. Make sure AdsPower browser is running with your desired profile"
echo "2. In AdsPower browser, press F12 to open DevTools"
echo "3. In DevTools, click ⋮ (three dots) > More tools > Remote devices"
echo "4. Copy the 'DevTools listening on...' WebSocket URL"
echo "5. Update your .env file with the new URL"
echo ""
echo "Current WebSocket URL in .env file:"
grep WS_ENDPOINT .env
echo ""
echo "To update, edit the .env file or run this command (replace with your URL):"
echo "echo 'WS_ENDPOINT=ws://127.0.0.1:XXXXX/devtools/browser/your-browser-id' > .env"
