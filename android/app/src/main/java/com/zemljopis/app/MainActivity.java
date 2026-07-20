package com.zemljopis.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Ista početna boja kao native i web splash: nema tamnog kadra dok WebView učitava stranicu.
    private static final int ZEMLJOPIS_LAUNCH_BACKGROUND = Color.rgb(223, 244, 255);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceIdentityPlugin.class);
        getWindow().setBackgroundDrawable(new ColorDrawable(ZEMLJOPIS_LAUNCH_BACKGROUND));
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setBackgroundColor(ZEMLJOPIS_LAUNCH_BACKGROUND);
        }
    }
}
