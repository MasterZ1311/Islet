# Removes one notification from the Windows notification centre (#225).
# Tag, group and app id come in through the environment (ISLET_TAG, ISLET_GROUP, ISLET_AUMID),
# never the command line, since they are written by other apps.
$ErrorActionPreference = "Stop"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
try {
  [Windows.UI.Notifications.ToastNotificationManager]::History.Remove($env:ISLET_TAG, $env:ISLET_GROUP, $env:ISLET_AUMID)
  "ok"
} catch { "fail" }
