package com.izdrail.greader;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NativeBridgePlugin.class);
    super.onCreate(savedInstanceState);
    // Re-apply the stored per-app locale after process death (locale automation stub).
    NativeBridgePlugin.applyStoredLocale(this);
  }
}
