<?php
/**
 * Plugin Name:       La Provvidenza ODV - Gestione Prenotazioni
 * Plugin URI:        https://www.laprovvidenza.it
 * Description:        Integra l'app "La Provvidenza ODV" nel sito WordPress. Aggiunge lo shortcode [provvidenza_app] per accedere e gestire le prenotazioni dal PC.
 * Version:           1.0.0
 * Author:            La Provvidenza ODV
 * License:           GPL-2.0-or-later
 * Text Domain:       provvidenza-app
 */

// Blocca l'accesso diretto.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PROVVIDENZA_APP_OPT', 'provvidenza_app_options' );

/**
 * Valori di default delle opzioni.
 */
function provvidenza_app_defaults() {
	return array(
		'app_url' => '',      // URL dell'app pubblicata (es. https://app.laprovvidenza.it)
		'height'  => 820,      // Altezza iframe in px
		'mode'    => 'both',   // both | embed | button
	);
}

function provvidenza_app_get_options() {
	$opts = get_option( PROVVIDENZA_APP_OPT, array() );
	return wp_parse_args( is_array( $opts ) ? $opts : array(), provvidenza_app_defaults() );
}

/* -------------------------------------------------------------------------
 *  PAGINA IMPOSTAZIONI (Impostazioni -> Provvidenza App)
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', function () {
	add_options_page(
		'Provvidenza App',
		'Provvidenza App',
		'manage_options',
		'provvidenza-app',
		'provvidenza_app_settings_page'
	);
} );

add_action( 'admin_init', function () {
	register_setting( 'provvidenza_app_group', PROVVIDENZA_APP_OPT, 'provvidenza_app_sanitize' );
} );

function provvidenza_app_sanitize( $input ) {
	$out            = provvidenza_app_defaults();
	$out['app_url'] = isset( $input['app_url'] ) ? esc_url_raw( trim( $input['app_url'] ) ) : '';
	$out['height']  = isset( $input['height'] ) ? max( 400, intval( $input['height'] ) ) : 820;
	$mode           = isset( $input['mode'] ) ? sanitize_text_field( $input['mode'] ) : 'both';
	$out['mode']    = in_array( $mode, array( 'both', 'embed', 'button' ), true ) ? $mode : 'both';
	return $out;
}

function provvidenza_app_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$opts = provvidenza_app_get_options();
	?>
	<div class="wrap">
		<h1>La Provvidenza ODV &mdash; Gestione Prenotazioni</h1>
		<p>Configura l'app e poi inserisci lo shortcode <code>[provvidenza_app]</code> in una pagina
		(es. "Area Riservata"). Da lÃ¬ potrai <strong>accedere e gestire le prenotazioni dal PC</strong>.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'provvidenza_app_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="pv_url">URL dell'app pubblicata</label></th>
					<td>
						<input name="<?php echo esc_attr( PROVVIDENZA_APP_OPT ); ?>[app_url]" id="pv_url"
							type="url" class="regular-text" placeholder="https://app.laprovvidenza.it"
							value="<?php echo esc_attr( $opts['app_url'] ); ?>" style="width:100%;max-width:640px;" />
						<p class="description">Inserisci lâ€™indirizzo pubblico del gestionale, ad esempio <code>https://app.laprovvidenza.it</code>.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="pv_height">Altezza area app (px)</label></th>
					<td><input name="<?php echo esc_attr( PROVVIDENZA_APP_OPT ); ?>[height]" id="pv_height"
						type="number" min="400" step="10" value="<?php echo esc_attr( $opts['height'] ); ?>" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="pv_mode">ModalitÃ  di visualizzazione</label></th>
					<td>
						<select name="<?php echo esc_attr( PROVVIDENZA_APP_OPT ); ?>[mode]" id="pv_mode">
							<option value="both" <?php selected( $opts['mode'], 'both' ); ?>>Pulsante + App incorporata (consigliato)</option>
							<option value="embed" <?php selected( $opts['mode'], 'embed' ); ?>>Solo app incorporata</option>
							<option value="button" <?php selected( $opts['mode'], 'button' ); ?>>Solo pulsante (apre in nuova scheda)</option>
						</select>
						<p class="description">Se l'app incorporata non si visualizza (alcuni hosting bloccano l'iframe), usa "Solo pulsante".</p>
					</td>
				</tr>
			</table>
			<?php submit_button( 'Salva impostazioni' ); ?>
		</form>

		<hr />
		<h2>Come si usa</h2>
		<ol>
			<li>Pubblica l'app con il pulsante <strong>Publish</strong> e copia l'URL ottenuto.</li>
			<li>Incolla l'URL qui sopra e salva.</li>
			<li>Crea una pagina WordPress (es. <em>Area Riservata</em>) e inserisci lo shortcode:
				<code>[provvidenza_app]</code></li>
			<li>Apri la pagina dal PC, effettua il login (CyborgC17 o gli account volontari) e gestisci le prenotazioni.</li>
		</ol>
		<p><strong>Attributi opzionali dello shortcode:</strong>
			<code>[provvidenza_app height="900" mode="button" url="https://..."]</code></p>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 *  SHORTCODE  [provvidenza_app]
 * ---------------------------------------------------------------------- */
add_shortcode( 'provvidenza_app', function ( $atts ) {
	$opts = provvidenza_app_get_options();
	$atts = shortcode_atts(
		array(
			'url'    => $opts['app_url'],
			'height' => $opts['height'],
			'mode'   => $opts['mode'],
		),
		$atts,
		'provvidenza_app'
	);

	$url    = esc_url( $atts['url'] );
	$height = max( 400, intval( $atts['height'] ) );
	$mode   = in_array( $atts['mode'], array( 'both', 'embed', 'button' ), true ) ? $atts['mode'] : 'both';

	if ( empty( $url ) ) {
		if ( current_user_can( 'manage_options' ) ) {
			return '<div style="padding:16px;border:1px dashed #d63638;border-radius:8px;color:#d63638;">'
				. 'Provvidenza App: imposta prima l\'URL dell\'app in <strong>Impostazioni &rarr; Provvidenza App</strong>.'
				. '</div>';
		}
		return '';
	}

	ob_start();
	?>
	<div class="provvidenza-app-wrap" style="max-width:1100px;margin:0 auto;">
		<?php if ( 'embed' !== $mode ) : ?>
			<div style="text-align:center;margin:0 0 16px;">
				<a href="<?php echo $url; ?>" target="_blank" rel="noopener"
					style="display:inline-flex;align-items:center;gap:8px;background:#FF6B00;color:#fff;
					text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;font-size:16px;
					box-shadow:0 4px 14px rgba(255,107,0,.35);">
					&#128274; Accedi alla Gestione Prenotazioni
				</a>
				<p style="color:#5B6776;font-size:13px;margin-top:8px;">
					Si apre l'area riservata di La Provvidenza ODV. Accedi con le tue credenziali.
				</p>
			</div>
		<?php endif; ?>

		<?php if ( 'button' !== $mode ) : ?>
			<div style="position:relative;width:100%;border:1px solid #E5E0D8;border-radius:12px;overflow:hidden;
				box-shadow:0 2px 12px rgba(0,0,0,.06);background:#FDFBF7;">
				<iframe
					src="<?php echo $url; ?>"
					title="La Provvidenza ODV - App"
					loading="lazy"
					style="width:100%;height:<?php echo esc_attr( $height ); ?>px;border:0;display:block;"
					allow="clipboard-read; clipboard-write; geolocation"
					referrerpolicy="no-referrer-when-downgrade">
				</iframe>
			</div>
			<p style="color:#8a8a8a;font-size:12px;text-align:center;margin-top:8px;">
				Se l'area sopra rimane vuota, usa il pulsante arancione per aprire l'app in una nuova scheda.
			</p>
		<?php endif; ?>
	</div>
	<?php
	return ob_get_clean();
} );

