<?php
class WCGDC_Checkout {
    public function __construct() {
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
        add_action( 'woocommerce_checkout_before_order_review', [ $this, 'add_checkout_map' ], 10 );
        add_action( 'woocommerce_checkout_process', [ $this, 'validate_checkout' ] );
        add_action( 'woocommerce_checkout_update_order_meta', [ $this, 'save_order_meta' ] );
        add_action( 'woocommerce_admin_order_data_after_shipping_address', [ $this, 'display_order_meta' ] );
        
        // Forzar recalcular envío al cambiar coordenadas
        add_filter( 'woocommerce_cart_shipping_packages', [ $this, 'add_coordinates_to_package' ] );
        
        // AJAX Endpoints
        add_action( 'wp_ajax_wcgdc_save_coordinates', [ $this, 'save_coordinates_ajax' ] );
        add_action( 'wp_ajax_nopriv_wcgdc_save_coordinates', [ $this, 'save_coordinates_ajax' ] );
    }

    public function enqueue_scripts() {
        if ( is_checkout() && ! is_wc_endpoint_url( 'order-received' ) ) {
            $provider = get_option( 'wcgdc_map_provider', 'leaflet' );
            $store_lat = get_option( 'wcgdc_store_lat', '0' );
            $store_lng = get_option( 'wcgdc_store_lng', '0' );

            if ( $provider === 'google' ) {
                $api_key = get_option( 'wcgdc_google_api_key' );
                wp_enqueue_script( 'google-maps', "https://maps.googleapis.com/maps/api/js?key={$api_key}&libraries=places", [], null, true );
            } else {
                wp_enqueue_style( 'leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' );
                wp_enqueue_script( 'leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], null, true );
            }

            wp_enqueue_style( 'wcgdc-style', WCGDC_PLUGIN_URL . 'assets/css/style.css' );
            wp_enqueue_script( 'wcgdc-checkout', WCGDC_PLUGIN_URL . 'assets/js/checkout-map.js', ['jquery'], '1.0.0', true );

            wp_localize_script( 'wcgdc-checkout', 'wcgdc_vars', [
                'provider'  => $provider,
                'store_lat' => $store_lat,
                'store_lng' => $store_lng,
                'ajax_url'  => admin_url( 'admin-ajax.php' ),
                'nonce'     => wp_create_nonce( 'wcgdc_checkout_nonce' )
            ] );
        }
    }

    public function add_checkout_map() {
        echo '<div id="wcgdc-checkout-map-container">';
        echo '<h3>Ubicación de Entrega</h3>';
        echo '<p>Mueve el marcador para seleccionar la ubicación exacta de entrega.</p>';
        echo '<div id="wcgdc-map"></div>';
        
        woocommerce_form_field( 'wcgdc_reference', [
            'type'        => 'textarea',
            'class'       => ['form-row-wide', 'wcgdc-reference-field'],
            'label'       => 'Referencias de la dirección',
            'placeholder' => 'Ej: Casa blanca de dos pisos, frente al parque...',
            'required'    => true,
        ], WC()->checkout->get_value( 'wcgdc_reference' ) );

        echo '<input type="hidden" name="wcgdc_lat" id="wcgdc_lat" value="">';
        echo '<input type="hidden" name="wcgdc_lng" id="wcgdc_lng" value="">';
        echo '</div>';
    }

    public function validate_checkout() {
        $lat = WC()->session->get( 'wcgdc_lat' );
        $lng = WC()->session->get( 'wcgdc_lng' );

        if ( empty( $lat ) || empty( $lng ) ) {
            wc_add_notice( 'Por favor, selecciona tu ubicación exacta en el mapa.', 'error' );
        }
        if ( empty( $_POST['wcgdc_reference'] ) ) {
            wc_add_notice( 'Por favor, ingresa una referencia para tu dirección.', 'error' );
        }
    }

    public function save_order_meta( $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) return;

        $lat = WC()->session->get( 'wcgdc_lat' );
        $lng = WC()->session->get( 'wcgdc_lng' );
        $reference = isset( $_POST['wcgdc_reference'] ) ? sanitize_text_field( $_POST['wcgdc_reference'] ) : '';

        $needs_save = false;

        if ( ! empty( $lat ) ) {
            $order->update_meta_data( '_wcgdc_lat', $lat );
            WC()->session->__unset( 'wcgdc_lat' ); // Limpiar sesión
            $needs_save = true;
        }
        if ( ! empty( $lng ) ) {
            $order->update_meta_data( '_wcgdc_lng', $lng );
            WC()->session->__unset( 'wcgdc_lng' ); // Limpiar sesión
            $needs_save = true;
        }
        if ( ! empty( $reference ) ) {
            $order->update_meta_data( '_wcgdc_reference', $reference );
            $needs_save = true;
        }

        if ( $needs_save ) {
            $order->save();
        }
    }

    public function add_coordinates_to_package( $packages ) {
        $lat = WC()->session->get( 'wcgdc_lat' );
        $lng = WC()->session->get( 'wcgdc_lng' );

        if ( $lat && $lng ) {
            foreach ( $packages as $i => $package ) {
                $packages[ $i ]['destination']['wcgdc_lat'] = $lat;
                $packages[ $i ]['destination']['wcgdc_lng'] = $lng;
            }
        }
        return $packages;
    }

    public function save_coordinates_ajax() {
        check_ajax_referer( 'wcgdc_checkout_nonce', 'nonce' );

        $lat = isset( $_POST['lat'] ) ? sanitize_text_field( $_POST['lat'] ) : '';
        $lng = isset( $_POST['lng'] ) ? sanitize_text_field( $_POST['lng'] ) : '';

        if ( $lat && $lng ) {
            WC()->session->set( 'wcgdc_lat', $lat );
            WC()->session->set( 'wcgdc_lng', $lng );
            wp_send_json_success();
        }

        wp_send_json_error();
    }
    
    public function display_order_meta( $order ) {
        $lat = $order->get_meta( '_wcgdc_lat' );
        $lng = $order->get_meta( '_wcgdc_lng' );
        $ref = $order->get_meta( '_wcgdc_reference' );
        
        if ( $lat && $lng ) {
            echo '<p><strong>Ubicación Mapa:</strong> <a href="https://maps.google.com/?q='.$lat.','.$lng.'" target="_blank">Ver en Google Maps</a></p>';
        }
        if ( $ref ) {
            echo '<p><strong>Referencia Dirección:</strong> <br>' . esc_html( $ref ) . '</p>';
        }
    }
}
