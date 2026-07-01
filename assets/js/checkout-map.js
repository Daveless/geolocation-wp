jQuery(function($){
    let map;
    let marker;
    let pendingRequest = null;
    let debounceTimer = null;

    function initMap() {
        const lat = parseFloat(wcgdc_vars.store_lat) || 0;
        const lng = parseFloat(wcgdc_vars.store_lng) || 0;
        const defaultLocation = { lat: lat, lng: lng };

        if (wcgdc_vars.provider === 'google') {
            map = new google.maps.Map(document.getElementById('wcgdc-map'), {
                center: defaultLocation,
                zoom: 13
            });

            marker = new google.maps.Marker({
                position: defaultLocation,
                map: map,
                draggable: true
            });

            google.maps.event.addListener(marker, 'dragend', function(event) {
                updateCoordinates(event.latLng.lat(), event.latLng.lng());
            });

        } else if (wcgdc_vars.provider === 'leaflet') {
            map = L.map('wcgdc-map').setView([lat, lng], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            marker = L.marker([lat, lng], {draggable: true}).addTo(map);

            marker.on('dragend', function(event) {
                const position = marker.getLatLng();
                updateCoordinates(position.lat, position.lng);
            });
        }
        
        // Marker is shown at store location for reference only — no coordinates
        // are saved until the user explicitly clicks on the map or drags the marker.
        // Hidden inputs wcgdc_lat / wcgdc_lng remain empty.
    }

    function updateCoordinates(lat, lng) {
        $('#wcgdc_lat').val(lat);
        $('#wcgdc_lng').val(lng);

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(function () {
            if (pendingRequest) {
                pendingRequest.abort();
                pendingRequest = null;
            }

            const $reviewOrder = $('.woocommerce-checkout-review-order');
            if ($reviewOrder.length) {
                $reviewOrder.addClass('processing').block({
                    message: null,
                    overlayCSS: { background: '#fff', opacity: 0.6 }
                });
            }

            pendingRequest = $.ajax({
                type: 'POST',
                url: wcgdc_vars.ajax_url,
                data: {
                    action: 'wcgdc_save_coordinates',
                    nonce: wcgdc_vars.nonce,
                    lat: lat,
                    lng: lng
                },
                success: function () {
                    $('body').trigger('update_checkout');
                },
                error: function (jqXHR) {
                    if (jqXHR.statusText === 'abort') {
                        return;
                    }
                    if (jqXHR.status === 403 || jqXHR.status === 400) {
                        alert('Sesión expirada. Por favor, recarga la página.');
                        return;
                    }
                    alert('No se pudo actualizar la ubicación. Intenta de nuevo.');
                },
                complete: function () {
                    pendingRequest = null;
                    if ($reviewOrder.length) {
                        $reviewOrder.removeClass('processing').unblock();
                    }
                }
            });
        }, 400);
    }

    function checkMapLoaded(attempts) {
        attempts = attempts || 0;
        if (wcgdc_vars.provider === 'google' && typeof google !== 'undefined' && google.maps) {
            initMap();
        } else if (wcgdc_vars.provider === 'leaflet' && typeof L !== 'undefined') {
            initMap();
        } else if (attempts < 30) {
            setTimeout(function () { checkMapLoaded(attempts + 1); }, 200);
        } else {
            $('#wcgdc-map').html('<p style="padding:20px;text-align:center;">No se pudo cargar el mapa. <a href="javascript:location.reload()">Recarga la página</a>.</p>');
        }
    }

    if ($('#wcgdc-map').length) {
        checkMapLoaded(0);
    }
    
    // Fix map rendering issues when fragments are updated
    $(document.body).on('updated_checkout', function() {
        if(wcgdc_vars.provider === 'leaflet' && map) {
            map.invalidateSize();
        }
    });
});
