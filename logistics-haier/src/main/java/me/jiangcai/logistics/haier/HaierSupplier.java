package me.jiangcai.logistics.haier;

import me.jiangcai.logistics.LogisticsSupplier;
import me.jiangcai.logistics.Product;

import java.time.format.DateTimeFormatter;

/**
 * @author CJ
 */
public interface HaierSupplier extends LogisticsSupplier {

    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");


    // 被动 rrs_reject 拒绝入库
    // 被动 rrs_outinstore 确认出入库
    // 被动 rrs_statusback 状态更新


    // rrs_cancel 取消订单

    /**
     * 取消订单
     *
     * @param id     订单号
     * @param focus  是否强制？就是出了库了要取消
     * @param reason 原因
     */
    void cancelOrder(String id, boolean focus, String reason);


    // rrs_productdata 产品信息同步

    /**
     * 更新产品信息
     *
     * @param product 产品
     */
    void updateProduct(Product product);

    /**
     * 签名
     *
     * @param content  签名内容
     * @param keyValue
     * @return 签名结果
     */
    String sign(String content, String keyValue);
}
