<?php
/**
 * Plugin Name: WooCommerce Geo Delivery Cost
 * Plugin URI: 
 * Description: Calcula el costo de envío basado en geolocalización (distancia en km) usando Google Maps o Leaflet.
 * Version: 1.0.0
 * Author: Antigravity
 * Text Domain: wcgdc
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'WCGDC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WCGDC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WCGDC_VERSION', '1.0.0' );

// Include required files
add_action( 'plugins_loaded', 'wcgdc_init' );

function wcgdc_init() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        return;
    }

    require_once WCGDC_PLUGIN_DIR . 'includes/class-wcgdc-settings.php';
    require_once WCGDC_PLUGIN_DIR . 'includes/class-wc-shipping-geo-delivery.php';
    require_once WCGDC_PLUGIN_DIR . 'includes/class-wcgdc-checkout.php';

    // Register settings
    new WCGDC_Settings();
    
    // Register Checkout features
    new WCGDC_Checkout();

    // Register shipping method
    add_filter( 'woocommerce_shipping_methods', function( $methods ) {
        $methods['geo_delivery'] = 'WC_Shipping_Geo_Delivery';
        return $methods;
    } );
}
