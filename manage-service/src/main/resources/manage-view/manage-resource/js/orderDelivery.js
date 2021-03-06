$(function () {

    var undeliveredObj = {};
    var depotObj = {};
    var $undelivered = $('#J_undelivered');
    var $depot = $('#J_depot');

    $undelivered.find('tbody').find('tr').each(function () {
        undeliveredObj[$(this).attr('data-goods-id')] = $(this).find('.js-stock').text();
    });


    $depot.find('tbody').find('tr').each(function () {
        var depotId = $(this).attr('data-depot-id');
        var $p = $(this).find('p');
        depotObj[depotId] = {};
        $p.each(function () {
            depotObj[depotId][$(this).attr('data-goods-id')] = $(this).attr('data-stock');
        });
    });
    var goodsInputs = $('input[name=goods]');

    var $selectDepot = $('#J_selectDepot');

    function afterDepotChanged() {
        var value = $selectDepot.val();
        // goodsInputs.attr('max', '0');
        goodsInputs.attr({
            'max': '0'
            , 'min': '0'
        });
        if (value) {
            var productAmounts = depotObj[value];
            Render.goodsList(productAmounts);
            var home = $('#J_goodsLists');
            $.each(productAmounts, function (code, value) {
                // console.log(code, value);
                var div = $('div[data-goods-id=' + code + ']', home);
                var input = $('input', div);
                input.attr('max', Math.min(input.data('max'), value));
            });
        }
        checkAllGoods();
    }

    $selectDepot.change(afterDepotChanged);
    afterDepotChanged();

    var Render = {
        goodsList: function (obj) {
            var parent = $('#J_goodsLists');
            parent.find('.form-group').each(function () {
                var goodId = $(this).attr('data-goods-id');
                // var max = +undeliveredObj[goodId] > +obj[goodId] ? obj[goodId] : undeliveredObj[goodId];
                // $(this).find('input').attr('max', max);
                $(this).find('.text-danger').text('库存：' + (obj[goodId] || 0) + '，待发货：' + undeliveredObj[goodId]);
                // if (max === 0) $(this).remove();
            })
        },
        depotList: function (obj) {
            $.each(obj, function (i, v) {
                $depot.find('tbody').find('tr').each(function () {
                    var depotId = $(this).attr('data-depot-id');
                    if (depotId == i) {
                        var $p = $(this).find('p');
                        $p.each(function () {
                            var goodsId = $(this).attr('data-goods-id');
                            $(this).attr('data-stock', v[goodsId])
                                .find('.text-danger').text(v[goodsId]);
                        });
                    }

                });
            })
        },
        resetUndelivered: function (data) {
            $.each(data, function (i, v) {
                var arr = v.split(',');
                undeliveredObj[arr[0]] = undeliveredObj[arr[0]] - arr[1];
            });

            $undelivered.find('tbody').find('tr').each(function () {
                $(this).find('.js-stock').text(undeliveredObj[$(this).attr('data-goods-id')]);
            });
            this.complete();
        },
        complete: function () {
            var complete = true;
            $.each(undeliveredObj, function (i, v) {
                if (v > 0) complete = false;
            });
            if (complete) $('#J_delivery').addClass('disabled').prop('disabled', true);
        },
        resetGoodsList: function (value) {
            this.goodsList(depotObj[value]);
            $('#J_goodsLists').find('.js-goods').val(0);
        }
    };

    function handleShipResult(res, formData) {
        if (res.resultCode !== 200) {
            layer.msg(res.resultMsg);
            return false;
        }
        Render.resetUndelivered(formData['goods']);
        depotObj = res.data;
        Render.depotList(res.data);
        Render.resetGoodsList($selectDepot.val());
    }

    function readLocalStorage(key) {
        if (!localStorage)
            return '';
        return localStorage.getItem(key) || '';
    }

    function updateLocalStorage(key, value) {
        if (!localStorage)
            return '';
        localStorage.setItem(key, value);
    }

    $('#J_delivery').click(function () {
        if (!$selectDepot.val()) return layer.msg('请选择仓库');
        var formData = getData();
        if (formData) {
            var loading = layer.load();
            $.ajax('/api/logisticsShip', {
                method: 'POST',
                data: formData,
                dataType: 'json',
                success: function (res) {
                    layer.close(loading);
                    if (res.resultCode === 302) {
                        // 需要 orderNumber
                        layer.open({
                            title: res.resultMsg,
                            content: $('#ManuallyOrderInputs').html(),
                            area: ['400px', '230px'],
                            zIndex: 9999,
                            success: function (ui) {
                                $('input[name=company]', ui).val(readLocalStorage('LastManuallyOrderCompany'));
                            }, yes: function (index, ui) {
                                // 再次提交
                                formData.company = $('input[name=company]', ui).val();
                                updateLocalStorage('LastManuallyOrderCompany', formData.company);
                                formData.orderNumber = $('input[name=orderNumber]', ui).val();
                                $.ajax('/api/logisticsShip', {
                                    method: 'POST',
                                    data: formData,
                                    dataType: 'json',
                                    success: function (res2) {
                                        layer.close(index);
                                        return handleShipResult(res2, formData);
                                    }
                                });
                            }
                        });
                        return;
                    }
                    return handleShipResult(res, formData);
                },
                error: function () {
                    layer.close(loading);
                    layer.msg('系统错误，稍后重试')
                }
            })
        }
    });

    function getData() {
        var verify = true;
        var isEmpty = true;
        var data = {};
        $('#J_form').find('input').not('.js-goods').each(function () {
            data[$(this).attr('name')] = $(this).val();
        });
        $('#J_form').find('select').not('.js-goods').each(function () {
            data[$(this).attr('name')] = $(this).val();
        });
        var cleckbox = $('#J_installation');
        data[cleckbox.attr('name')] = cleckbox.is(':checked');
        var goods = [];
        $('.js-goods').each(function () {
            var goodsId = $(this).closest('.form-group').attr('data-goods-id');
            var val = +$(this).val();
            var max = +$(this).attr('max');
            if (val !== 0) isEmpty = false;
            if (val > max || val < 0) {
                verify = false;
                layer.msg('发货数量有错误，请检查后再发货');
            }
            goods.push(goodsId + ',' + val);
        });
        if (!verify) return '';
        if (isEmpty) {
            layer.msg('不能发送空商品');
            return '';
        }
        data['goods'] = goods;

        return data;
    }

    $('.js-goods').on('input', function () {
        $(this).val($(this).val().replace(/\D/g, ''));
    });

    // goods
    function checkAllGoods() {
        var installation = $('input[name=installation]');

        var goods = $('input[name=goods]').filter(function (_, ele) {
            var ele$ = $(ele);
            var number = +ele$.val();
            return (number > 0 && ele$.data('goods-installation'));
        });
        var currentDepotId = $selectDepot.val();
        var depotAllow;
        if (!currentDepotId) {
            depotAllow = false;
        } else {
            depotAllow = $('option[value=' + currentDepotId + ']', $selectDepot).data('installation-support');
        }
        //
        if (goods.size() > 0 && depotAllow) {
            installation.prop('disabled', false);
        } else {
            installation.prop('disabled', true);
            installation.prop('checked', false);
        }
    }

    checkAllGoods();

    goodsInputs.change(checkAllGoods);
    goodsInputs.blur(checkAllGoods);

});