# Per-app volume (#223): the audio sessions on the default speakers, one row per app.
#   mixer.ps1 list               -> [{"app":"chrome","vol":0.8,"mute":false,"active":true}, ...]
#   mixer.ps1 vol <app> 0..1     -> sets every session of that app, then prints the list
#   mixer.ps1 mute <app> on|off  -> mutes or unmutes that app, then prints the list
#   mixer.ps1 serve              -> stays running: reads those commands from stdin, one per line
#                                   ("list", "vol<TAB>app<TAB>0.3"), answers each with one JSON line
# <app> is a process name ("chrome", "Spotify", "Discord"); "system" is Windows' own sounds.
param([string]$Mode = "list", [string]$App = "", [string]$Value = "")
$ErrorActionPreference = "SilentlyContinue"
Add-Type @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
public static class IsletMixer {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator { }
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator { void EnumAudioEndpoints(int flow, int mask, out IntPtr devices); void GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device); }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice { void Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o); }
  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 { void GetAudioSessionControl(IntPtr a, int b, out IntPtr c); void GetSimpleAudioVolume(IntPtr a, int b, out IntPtr c); void GetSessionEnumerator(out IAudioSessionEnumerator e); }
  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator { void GetCount(out int n); void GetSession(int i, out IAudioSessionControl2 s); }
  [ComImport, Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    void GetState(out int s); void GetDisplayName(out IntPtr s); void SetDisplayName(IntPtr s, IntPtr g);
    void GetIconPath(out IntPtr s); void SetIconPath(IntPtr s, IntPtr g); void GetGroupingParam(out Guid g); void SetGroupingParam(IntPtr g, IntPtr c);
    void RegisterAudioSessionNotification(IntPtr n); void UnregisterAudioSessionNotification(IntPtr n);
    void GetSessionIdentifier(out IntPtr s); void GetSessionInstanceIdentifier(out IntPtr s); void GetProcessId(out uint pid);
    [PreserveSig] int IsSystemSoundsSession();
  }
  [ComImport, Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    void SetMasterVolume(float v, ref Guid ctx); void GetMasterVolume(out float v);
    void SetMute([MarshalAs(UnmanagedType.Bool)] bool m, ref Guid ctx); void GetMute([MarshalAs(UnmanagedType.Bool)] out bool m);
  }

  class Row { public string App; public float Vol; public bool Mute; public bool Active; }

  // every live session as (app name, volume control, state); expired ones (state 2) are left out
  static IEnumerable<Tuple<string, ISimpleAudioVolume, int>> Sessions() {
    var en = (IMMDeviceEnumerator)new MMDeviceEnumerator();
    IMMDevice dev; en.GetDefaultAudioEndpoint(0, 1, out dev);
    Guid iid = typeof(IAudioSessionManager2).GUID; object o;
    dev.Activate(ref iid, 23, IntPtr.Zero, out o);
    IAudioSessionEnumerator list; ((IAudioSessionManager2)o).GetSessionEnumerator(out list);
    int n; list.GetCount(out n);
    for (int i = 0; i < n; i++) {
      IAudioSessionControl2 c; list.GetSession(i, out c);
      int state; c.GetState(out state);
      if (state == 2) continue;
      string app;
      if (c.IsSystemSoundsSession() == 0) app = "system";
      else {
        uint pid; c.GetProcessId(out pid);
        try { app = Process.GetProcessById((int)pid).ProcessName; } catch { continue; } // the app already quit
      }
      yield return Tuple.Create(app, (ISimpleAudioVolume)c, state);
    }
  }

  public static string List() {
    var rows = new List<Row>();
    foreach (var s in Sessions()) {
      var r = rows.FirstOrDefault(x => string.Equals(x.App, s.Item1, StringComparison.OrdinalIgnoreCase));
      float v; bool m; s.Item2.GetMasterVolume(out v); s.Item2.GetMute(out m);
      if (r == null) rows.Add(new Row { App = s.Item1, Vol = v, Mute = m, Active = s.Item3 == 1 });
      else { r.Vol = Math.Max(r.Vol, v); r.Mute = r.Mute && m; r.Active |= s.Item3 == 1; } // an app with several sessions
    }
    var sb = new StringBuilder("[");
    foreach (var r in rows) {
      if (sb.Length > 1) sb.Append(',');
      var name = new StringBuilder();
      foreach (var ch in r.App) { if (ch == '"' || ch == '\\') name.Append('\\'); if (ch >= ' ') name.Append(ch); }
      sb.Append("{\"app\":\"").Append(name).Append("\",\"vol\":").Append(Math.Round(r.Vol, 3).ToString(CultureInfo.InvariantCulture))
        .Append(",\"mute\":").Append(r.Mute ? "true" : "false").Append(",\"active\":").Append(r.Active ? "true" : "false").Append('}');
    }
    return sb.Append(']').ToString();
  }

  public static void Set(string app, float vol, int mute) {
    Guid g = Guid.Empty;
    foreach (var s in Sessions()) {
      if (!string.Equals(s.Item1, app, StringComparison.OrdinalIgnoreCase)) continue;
      if (vol >= 0) s.Item2.SetMasterVolume(Math.Min(1, vol), ref g);
      if (mute >= 0) s.Item2.SetMute(mute == 1, ref g);
    }
  }
}
"@
$inv = [Globalization.CultureInfo]::InvariantCulture
function Run($m, $a, $v) {
  try {
    switch ($m) {
      "vol" { [IsletMixer]::Set($a, [single][math]::Min(1.0, [math]::Max(0.0, [double]::Parse($v, $inv))), -1) }
      "mute" { [IsletMixer]::Set($a, -1, $(if ($v -eq "on") { 1 } else { 0 })) }
    }
    [IsletMixer]::List()
  } catch { "[]" }
}
if ($Mode -ne "serve") { Run $Mode $App $Value; exit 0 }
# compiled once, answers in milliseconds; ends when Islet closes stdin
while ($null -ne ($line = [Console]::In.ReadLine())) {
  $p = $line.Split("`t")
  [Console]::Out.WriteLine((Run $p[0] $p[1] $p[2]))
  [Console]::Out.Flush()
}
