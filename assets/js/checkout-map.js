jQuery(function($){
    let map;
    let marker;
    let pendingRequest = null;
    let debounceTimer = null;
    let autocomplete = null;
    let searchTimer = null;

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

            map.addListener('click', function(event) {
                marker.setPosition(event.latLng);
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

            map.on('click', function(event) {
                marker.setLatLng(event.latlng);
                updateCoordinates(event.latlng.lat, event.latlng.lng);
            });
        }
        
        // Marker is shown at store location for reference only — no coordinates
        // are saved until the user explicitly clicks on the map or drags the marker.
        // Hidden inputs wcgdc_lat / wcgdc_lng remain empty.

        initAddressSearch();
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

    function initAddressSearch() {
        if (wcgdc_vars.provider === 'google') {
            initGooglePlacesSearch();
        } else {
            initNominatimSearch();
        }

        // Vaciar campo de búsqueda antes del submit para no enviarlo como dato de orden
        $('form.checkout').on('submit', function () {
            $('#wcgdc_address_search').val('');
        });
    }

    function initGooglePlacesSearch() {
        var input = document.getElementById('wcgdc_address_search');
        if (!input) return;

        var options = { types: ['geocode'] };
        if (wcgdc_vars.country_code) {
            options.componentRestrictions = { country: wcgdc_vars.country_code };
        }

        autocomplete = new google.maps.places.Autocomplete(input, options);

        autocomplete.addListener('place_changed', function () {
            var place = autocomplete.getPlace();
            if (!place.geometry) return;

            var loc = place.geometry.location;
            marker.setPosition(loc);
            map.setCenter(loc);
            updateCoordinates(loc.lat(), loc.lng());
        });
    }

    function initNominatimSearch() {
        var $input = $('#wcgdc_address_search');
        if (!$input.length) return;

        // Crear el contenedor de sugerencias
        var $suggestions = $('<ul class="wcgdc-suggestions"></ul>').insertAfter($input);

        $input.on('input', function () {
            clearTimeout(searchTimer);
            var query = $.trim($input.val());
            $suggestions.empty().hide();

            if (query.length < 3) return;

            searchTimer = setTimeout(function () {
                $.ajax({
                    url: 'https://nominatim.openstreetmap.org/search',
                    data: {
                        format: 'json',
                        q: query,
                        limit: 5,
                        addressdetails: 1,
                        countrycodes: wcgdc_vars.country_code || ''
                    },
                    dataType: 'json',
                    headers: { 'Accept-Language': 'es' },
                    success: function (results) {
                        $suggestions.empty();
                        if (!results.length) return;

                        $.each(results, function (i, item) {
                            var display = item.display_name;
                            if (item.address && item.address.road) {
                                var parts = [];
                                if (item.address.road) parts.push(item.address.road);
                                if (item.address.house_number) parts.push(item.address.house_number);
                                if (item.address.city || item.address.town || item.address.village) {
                                    parts.push(item.address.city || item.address.town || item.address.village);
                                }
                                display = parts.join(', ');
                            }
                            $('<li>').text(display)
                                .on('click', function () {
                                    var lat = parseFloat(item.lat);
                                    var lng = parseFloat(item.lon);
                                    marker.setLatLng([lat, lng]);
                                    map.setView([lat, lng], 15);
                                    updateCoordinates(lat, lng);
                                    $suggestions.empty().hide();
                                    $input.blur();
                                })
                                .appendTo($suggestions);
                        });
                        $suggestions.show();
                    }
                });
            }, 500);
        });

        // Ocultar sugerencias al hacer clic fuera
        $(document).on('click', function (e) {
            if (!$(e.target).closest('.wcgdc-suggestions, #wcgdc_address_search').length) {
                $suggestions.empty().hide();
            }
        });
    }
    
    // Fix map rendering issues when fragments are updated
    $(document.body).on('updated_checkout', function() {
        if(wcgdc_vars.provider === 'leaflet' && map) {
            map.invalidateSize();
        }
    });
});
