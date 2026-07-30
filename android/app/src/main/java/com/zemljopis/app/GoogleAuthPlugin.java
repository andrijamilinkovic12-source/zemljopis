package com.zemljopis.app;

import android.app.Activity;

import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

/**
 * Native Sign in with Google bridge for the Capacitor WebView.
 * The returned ID token is verified exclusively by the application server.
 */
@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        final Activity activity = getActivity();
        final String serverClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID == null
            ? ""
            : BuildConfig.GOOGLE_WEB_CLIENT_ID.trim();

        if (activity == null) {
            call.reject("Google prijava trenutno nije dostupna.", "GOOGLE_ACTIVITY_NEDOSTUPNA");
            return;
        }
        if (serverClientId.isEmpty()) {
            call.reject(
                "Google prijava nije podešena u Android izdanju.",
                "GOOGLE_CLIENT_ID_NIJE_PODESEN"
            );
            return;
        }

        try {
            GetSignInWithGoogleOption.Builder optionBuilder =
                new GetSignInWithGoogleOption.Builder(serverClientId);
            String nonce = call.getString("nonce", "").trim();
            if (!nonce.isEmpty()) optionBuilder.setNonce(nonce);

            GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(optionBuilder.build())
                .build();

            CredentialManager.create(getContext()).getCredentialAsync(
                activity,
                request,
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse result) {
                        Credential credential = result.getCredential();
                        if (!(credential instanceof CustomCredential)
                            || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                            call.reject("Google nije vratio važeću potvrdu identiteta.", "GOOGLE_POGRESAN_TIP_POTVRDE");
                            return;
                        }

                        try {
                            GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(
                                ((CustomCredential) credential).getData()
                            );
                            JSObject odgovor = new JSObject();
                            odgovor.put("idToken", googleCredential.getIdToken());
                            odgovor.put("email", googleCredential.getId());
                            call.resolve(odgovor);
                        } catch (Exception error) {
                            call.reject("Google potvrdu identiteta nije moguće pročitati.", "GOOGLE_TOKEN_NEISPRAVAN", error);
                        }
                    }

                    @Override
                    public void onError(GetCredentialException error) {
                        call.reject("Google prijava je prekinuta ili trenutno nije dostupna.", "GOOGLE_PRIJAVA_NIJE_USPELA", error);
                    }
                }
            );
        } catch (Exception error) {
            call.reject("Google prijavu nije moguće pokrenuti.", "GOOGLE_PRIJAVA_NIJE_USPELA", error);
        }
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        try {
            CredentialManager.create(getContext()).clearCredentialStateAsync(
                new ClearCredentialStateRequest(ClearCredentialStateRequest.TYPE_CLEAR_CREDENTIAL_STATE),
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void ignored) {
                        call.resolve();
                    }

                    @Override
                    public void onError(ClearCredentialException error) {
                        // Local account state is already removed; this only controls the next picker.
                        call.resolve();
                    }
                }
            );
        } catch (Exception error) {
            call.resolve();
        }
    }
}
